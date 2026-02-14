import type { CascadeClient } from './client';
import type { AIStatus, AIAnalysis, AIAction, ActionResult } from './types';

/**
 * AI-specific endpoints for intelligent hardware monitoring
 */
export class AIClient {
  constructor(private client: CascadeClient) {}

  /** Get AI-friendly system status with health scores */
  getStatus(): Promise<AIStatus> {
    return this.client.get('/ai/status');
  }

  /** Get semantic analysis with recommendations and warnings */
  getAnalysis(): Promise<AIAnalysis> {
    return this.client.get('/ai/analysis');
  }

  /** Get available AI actions */
  async getActions(): Promise<AIAction[]> {
    const result = await this.client.get<{ actions: AIAction[] }>('/ai/actions');
    return result.actions;
  }

  /** Execute an AI action */
  executeAction(action: string, params: Record<string, unknown> = {}): Promise<ActionResult> {
    return this.client.post('/ai/action', { action, params });
  }
}
