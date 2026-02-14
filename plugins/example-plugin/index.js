export default class ExamplePlugin {
  constructor(metadata) {
    this.metadata = metadata;
    this.running = false;
  }

  async init() {
    console.log(`[${this.metadata.name}] Initializing...`);
  }

  async start() {
    this.running = true;
    console.log(`[${this.metadata.name}] Started`);
  }

  async stop() {
    this.running = false;
    console.log(`[${this.metadata.name}] Stopped`);
  }

  async poll() {
    if (!this.running) return [];

    return [
      {
        name: 'Example Temperature',
        type: 'temperature',
        value: 25 + Math.random() * 10,
        min: 0,
        max: 100,
        unit: '°C',
        source: 'custom.example',
        timestamp: Date.now()
      },
      {
        name: 'Example Load',
        type: 'load',
        value: Math.random() * 100,
        min: 0,
        max: 100,
        unit: '%',
        source: 'custom.example',
        timestamp: Date.now()
      }
    ];
  }

  async destroy() {
    console.log(`[${this.metadata.name}] Destroyed`);
  }
}
