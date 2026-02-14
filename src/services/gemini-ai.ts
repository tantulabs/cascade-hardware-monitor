/**
 * Gemini AI Integration for Cascade Hardware Monitor
 * Provides AI-powered hardware analysis, recommendations, and health assessments
 */

import { createChildLogger } from '../core/logger.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const logger = createChildLogger('gemini-ai');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

interface GeminiConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface HardwareAnalysis {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number;
  summary: string;
  recommendations: string[];
  warnings: string[];
  optimizations: string[];
  predictedIssues: string[];
  aiConfidence: number;
}

interface ThermalAnalysis {
  status: 'optimal' | 'warm' | 'hot' | 'critical';
  headroom: number;
  throttlingRisk: 'none' | 'low' | 'medium' | 'high';
  coolingRecommendations: string[];
}

interface PerformanceAnalysis {
  cpuBottleneck: boolean;
  gpuBottleneck: boolean;
  memoryBottleneck: boolean;
  storageBottleneck: boolean;
  bottleneckExplanation: string;
  optimizationSuggestions: string[];
}

interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiAIService {
  private apiKey: string | null = null;
  private model: string = 'gemini-2.0-flash';
  private enabled: boolean = false;
  private configPath: string;
  private encryptionKey: Buffer;

  constructor() {
    this.configPath = path.join(process.cwd(), 'data', 'gemini-config.enc');
    this.encryptionKey = this.deriveEncryptionKey();
  }

  private deriveEncryptionKey(): Buffer {
    const machineId = this.getMachineIdentifier();
    return crypto.scryptSync(machineId, 'cascade-hardware-monitor-salt', KEY_LENGTH);
  }

  private getMachineIdentifier(): string {
    try {
      const os = require('os');
      const cpus = os.cpus();
      const networkInterfaces = os.networkInterfaces();
      
      let identifier = os.hostname() + os.platform() + os.arch();
      
      if (cpus.length > 0) {
        identifier += cpus[0].model;
      }
      
      for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        if (interfaces && Array.isArray(interfaces)) {
          for (const iface of interfaces) {
            if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
              identifier += iface.mac;
              break;
            }
          }
        }
      }
      
      return identifier;
    } catch {
      return 'cascade-default-key-' + process.env.USERNAME || 'user';
    }
  }

  private encrypt(data: string): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decrypt(encryptedData: Buffer): string {
    const iv = encryptedData.subarray(0, IV_LENGTH);
    const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    if (this.apiKey && this.enabled) {
      logger.info('Gemini AI service initialized');
    } else {
      logger.info('Gemini AI service not configured - AI features disabled');
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const encryptedData = fs.readFileSync(this.configPath);
        const decryptedJson = this.decrypt(encryptedData);
        const config: GeminiConfig = JSON.parse(decryptedJson);
        
        this.apiKey = config.apiKey;
        this.model = config.model || 'gemini-2.0-flash';
        this.enabled = config.enabled;
        
        logger.debug('Gemini config loaded from encrypted file');
      }
    } catch (err) {
      logger.warn('Failed to load Gemini config:', err);
      this.apiKey = null;
      this.enabled = false;
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const dataDir = path.dirname(this.configPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const config: GeminiConfig = {
        apiKey: this.apiKey || '',
        model: this.model,
        enabled: this.enabled
      };
      
      const encryptedData = this.encrypt(JSON.stringify(config));
      fs.writeFileSync(this.configPath, encryptedData);
      
      logger.debug('Gemini config saved to encrypted file');
    } catch (err) {
      logger.error('Failed to save Gemini config:', err);
      throw err;
    }
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    const isValid = await this.validateApiKey(apiKey);
    
    if (isValid) {
      this.apiKey = apiKey;
      this.enabled = true;
      await this.saveConfig();
      logger.info('Gemini API key set and validated');
      return true;
    }
    
    return false;
  }

  async removeApiKey(): Promise<void> {
    this.apiKey = null;
    this.enabled = false;
    await this.saveConfig();
    logger.info('Gemini API key removed');
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  isAvailable(): boolean {
    return this.enabled && this.apiKey !== null;
  }

  getStatus(): { enabled: boolean; configured: boolean; model: string } {
    return {
      enabled: this.enabled,
      configured: this.apiKey !== null,
      model: this.model
    };
  }

  async setModel(model: string): Promise<void> {
    this.model = model;
    await this.saveConfig();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    await this.saveConfig();
  }

  private async callGemini(prompt: string): Promise<GeminiResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    
    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0
      } : undefined
    };
  }

  async analyzeHardwareHealth(snapshot: any): Promise<HardwareAnalysis> {
    if (!this.isAvailable()) {
      return this.getFallbackAnalysis(snapshot);
    }

    try {
      const prompt = this.buildHealthAnalysisPrompt(snapshot);
      const response = await this.callGemini(prompt);
      return this.parseHealthAnalysis(response.text, snapshot);
    } catch (err) {
      logger.error('Gemini hardware analysis failed:', err);
      return this.getFallbackAnalysis(snapshot);
    }
  }

  private buildHealthAnalysisPrompt(snapshot: any): string {
    return `
You are an expert hardware analyst. Analyze this system's hardware status and provide recommendations.

System Information:
- CPU: ${snapshot.cpu?.model || 'Unknown'}, ${snapshot.cpu?.cores || 0} cores
- CPU Temperature: ${snapshot.cpu?.temperature || 'N/A'}°C
- CPU Load: ${snapshot.cpu?.load || 0}%
- Memory: ${snapshot.memory?.used || 0}GB / ${snapshot.memory?.total || 0}GB (${snapshot.memory?.usedPercent || 0}%)
- GPUs: ${JSON.stringify(snapshot.gpu?.map((g: any) => ({ name: g.name, temp: g.temperature, load: g.utilization })) || [])}
- Disk Usage: ${snapshot.disks?.map((d: any) => `${d.name}: ${d.usedPercent}%`).join(', ') || 'N/A'}

Provide analysis in this exact JSON format:
{
  "overallHealth": "excellent|good|fair|poor|critical",
  "healthScore": 0-100,
  "summary": "Brief overall assessment",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "warnings": ["warning 1 if any"],
  "optimizations": ["optimization suggestion 1"],
  "predictedIssues": ["potential future issue 1"],
  "aiConfidence": 0-100
}

Be specific and actionable. Focus on thermal management, performance optimization, and longevity.
`;
  }

  private parseHealthAnalysis(responseText: string, snapshot: any): HardwareAnalysis {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallHealth: parsed.overallHealth || 'good',
          healthScore: parsed.healthScore || 75,
          summary: parsed.summary || 'System appears to be functioning normally',
          recommendations: parsed.recommendations || [],
          warnings: parsed.warnings || [],
          optimizations: parsed.optimizations || [],
          predictedIssues: parsed.predictedIssues || [],
          aiConfidence: parsed.aiConfidence || 80
        };
      }
    } catch {
      logger.warn('Failed to parse Gemini response, using fallback');
    }
    
    return this.getFallbackAnalysis(snapshot);
  }

  private getFallbackAnalysis(snapshot: any): HardwareAnalysis {
    const cpuTemp = snapshot.cpu?.temperature || 0;
    const cpuLoad = snapshot.cpu?.load || 0;
    const memUsed = snapshot.memory?.usedPercent || 0;
    
    let healthScore = 100;
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    if (cpuTemp > 85) {
      healthScore -= 30;
      warnings.push('CPU temperature is critically high');
      recommendations.push('Improve cooling or reduce workload');
    } else if (cpuTemp > 75) {
      healthScore -= 15;
      warnings.push('CPU temperature is elevated');
    }
    
    if (cpuLoad > 90) {
      healthScore -= 10;
      warnings.push('CPU is under heavy load');
    }
    
    if (memUsed > 90) {
      healthScore -= 20;
      warnings.push('Memory usage is very high');
      recommendations.push('Close unused applications or add more RAM');
    } else if (memUsed > 80) {
      healthScore -= 10;
      warnings.push('Memory usage is elevated');
    }
    
    let overallHealth: HardwareAnalysis['overallHealth'] = 'excellent';
    if (healthScore < 50) overallHealth = 'critical';
    else if (healthScore < 65) overallHealth = 'poor';
    else if (healthScore < 80) overallHealth = 'fair';
    else if (healthScore < 90) overallHealth = 'good';
    
    return {
      overallHealth,
      healthScore,
      summary: `System health score: ${healthScore}/100. ${warnings.length > 0 ? warnings[0] : 'All systems nominal.'}`,
      recommendations,
      warnings,
      optimizations: [],
      predictedIssues: [],
      aiConfidence: 0
    };
  }

  async analyzeThermals(snapshot: any): Promise<ThermalAnalysis> {
    if (!this.isAvailable()) {
      return this.getFallbackThermalAnalysis(snapshot);
    }

    try {
      const prompt = `
Analyze thermal status for this system:
- CPU Temperature: ${snapshot.cpu?.temperature || 'N/A'}°C (Max: ${snapshot.cpu?.temperatureMax || 100}°C)
- GPU Temperatures: ${JSON.stringify(snapshot.gpu?.map((g: any) => ({ name: g.name, temp: g.temperature })) || [])}

Provide analysis in JSON format:
{
  "status": "optimal|warm|hot|critical",
  "headroom": degrees until thermal throttling,
  "throttlingRisk": "none|low|medium|high",
  "coolingRecommendations": ["recommendation 1"]
}
`;
      const response = await this.callGemini(prompt);
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      logger.error('Thermal analysis failed:', err);
    }
    
    return this.getFallbackThermalAnalysis(snapshot);
  }

  private getFallbackThermalAnalysis(snapshot: any): ThermalAnalysis {
    const cpuTemp = snapshot.cpu?.temperature || 0;
    const maxTemp = snapshot.cpu?.temperatureMax || 100;
    const headroom = maxTemp - cpuTemp;
    
    let status: ThermalAnalysis['status'] = 'optimal';
    let throttlingRisk: ThermalAnalysis['throttlingRisk'] = 'none';
    const recommendations: string[] = [];
    
    if (cpuTemp > 90) {
      status = 'critical';
      throttlingRisk = 'high';
      recommendations.push('Immediate cooling intervention required');
    } else if (cpuTemp > 80) {
      status = 'hot';
      throttlingRisk = 'medium';
      recommendations.push('Consider improving airflow or reapplying thermal paste');
    } else if (cpuTemp > 70) {
      status = 'warm';
      throttlingRisk = 'low';
    }
    
    return {
      status,
      headroom,
      throttlingRisk,
      coolingRecommendations: recommendations
    };
  }

  async analyzePerformance(snapshot: any): Promise<PerformanceAnalysis> {
    if (!this.isAvailable()) {
      return this.getFallbackPerformanceAnalysis(snapshot);
    }

    try {
      const prompt = `
Analyze performance bottlenecks:
- CPU: ${snapshot.cpu?.model}, Load: ${snapshot.cpu?.load}%
- GPU: ${snapshot.gpu?.[0]?.name || 'None'}, Utilization: ${snapshot.gpu?.[0]?.utilization || 0}%
- Memory: ${snapshot.memory?.usedPercent}% used
- Disk: ${snapshot.disks?.[0]?.usedPercent || 0}% used

Provide analysis in JSON format:
{
  "cpuBottleneck": true/false,
  "gpuBottleneck": true/false,
  "memoryBottleneck": true/false,
  "storageBottleneck": true/false,
  "bottleneckExplanation": "explanation",
  "optimizationSuggestions": ["suggestion 1"]
}
`;
      const response = await this.callGemini(prompt);
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      logger.error('Performance analysis failed:', err);
    }
    
    return this.getFallbackPerformanceAnalysis(snapshot);
  }

  private getFallbackPerformanceAnalysis(snapshot: any): PerformanceAnalysis {
    const cpuLoad = snapshot.cpu?.load || 0;
    const gpuLoad = snapshot.gpu?.[0]?.utilization || 0;
    const memUsed = snapshot.memory?.usedPercent || 0;
    
    const cpuBottleneck = cpuLoad > 90 && gpuLoad < 70;
    const gpuBottleneck = gpuLoad > 90 && cpuLoad < 70;
    const memoryBottleneck = memUsed > 90;
    
    let explanation = 'System is balanced';
    const suggestions: string[] = [];
    
    if (cpuBottleneck) {
      explanation = 'CPU is limiting performance';
      suggestions.push('Consider upgrading CPU or reducing CPU-intensive tasks');
    } else if (gpuBottleneck) {
      explanation = 'GPU is limiting performance';
      suggestions.push('Consider upgrading GPU or lowering graphics settings');
    } else if (memoryBottleneck) {
      explanation = 'Memory is limiting performance';
      suggestions.push('Add more RAM or close memory-intensive applications');
    }
    
    return {
      cpuBottleneck,
      gpuBottleneck,
      memoryBottleneck,
      storageBottleneck: false,
      bottleneckExplanation: explanation,
      optimizationSuggestions: suggestions
    };
  }

  async chat(message: string, context?: any): Promise<string> {
    if (!this.isAvailable()) {
      return 'Gemini AI is not configured. Please add your API key in settings.';
    }

    try {
      let prompt = message;
      
      if (context) {
        prompt = `
You are a helpful hardware monitoring assistant. The user is asking about their system.

Current System Status:
${JSON.stringify(context, null, 2)}

User Question: ${message}

Provide a helpful, concise response focused on hardware monitoring and optimization.
`;
      }
      
      const response = await this.callGemini(prompt);
      return response.text;
    } catch (err) {
      logger.error('Gemini chat failed:', err);
      return 'Sorry, I encountered an error processing your request.';
    }
  }
}

export const geminiAI = new GeminiAIService();
export default geminiAI;
