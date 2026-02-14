/**
 * Cascade Hardware Monitor - TypeScript/JavaScript Client
 * 
 * Modern, AI-friendly hardware monitoring library. Superior alternative to
 * OpenHardwareMonitor with cross-platform support (Windows, macOS, Linux).
 * 
 * @packageDocumentation
 * @module cascade-hardware-monitor
 * @author TantuLabs
 * @license MIT
 * @see https://tantulabs-cascade.web.app
 * 
 * @example
 * ```typescript
 * import { CascadeClient } from 'cascade-hardware-monitor';
 * 
 * const client = new CascadeClient();
 * const snapshot = await client.getSnapshot();
 * console.log(`CPU: ${snapshot.cpu.load}%`);
 * 
 * // AI integration
 * const analysis = await client.ai.getAnalysis();
 * analysis.warnings.forEach(w => console.warn(w));
 * ```
 */

export * from './client';
export * from './types';
export * from './ai';
