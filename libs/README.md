# Cascade Hardware Monitor - Client Libraries

Multi-language client libraries for the Cascade Hardware Monitor API. Modern, AI-friendly hardware monitoring that is superior to OpenHardwareMonitor.

## Available Libraries

| Language | Package | Installation |
|----------|---------|--------------|
| **TypeScript/JavaScript** | `cascade-hardware-monitor` | `npm install cascade-hardware-monitor` |
| **Python** | `cascade-hardware-monitor` | `pip install cascade-hardware-monitor` |
| **Rust** | `cascade-hardware-monitor` | `cargo add cascade-hardware-monitor` |
| **C#** | `CascadeHardwareMonitor` | `dotnet add package CascadeHardwareMonitor` |
| **Go** | `cascade-hardware-monitor` | `go get github.com/tantulabs/cascade-hardware-monitor` |

## Features

All libraries provide:

- ✅ Full API coverage
- ✅ Strongly typed responses
- ✅ AI integration endpoints
- ✅ Hardware control capabilities
- ✅ Comprehensive documentation

## Quick Examples

### Python
```python
from cascade_hardware_monitor import CascadeClient

client = CascadeClient()
snapshot = client.get_snapshot()
print(f"CPU: {snapshot['cpu']['load']}%")

# AI analysis
analysis = client.ai.get_analysis()
for warning in analysis.warnings:
    print(f"Warning: {warning}")
```

### TypeScript
```typescript
import { CascadeClient } from 'cascade-hardware-monitor';

const client = new CascadeClient();
const snapshot = await client.getSnapshot();
console.log(`CPU: ${snapshot.cpu.load}%`);

const analysis = await client.ai.getAnalysis();
analysis.warnings.forEach(w => console.warn(w));
```

### Rust
```rust
use cascade_hardware_monitor::CascadeClient;

let client = CascadeClient::default()?;
let snapshot = client.get_snapshot()?;
println!("CPU: {}%", snapshot.cpu.load);

let analysis = client.ai().get_analysis()?;
for warning in &analysis.warnings {
    println!("Warning: {}", warning);
}
```

### C#
```csharp
using CascadeHardwareMonitor;

var client = new CascadeClient();
var snapshot = await client.GetSnapshotAsync();
Console.WriteLine($"CPU: {snapshot.Cpu.Load}%");

var analysis = await client.AI.GetAnalysisAsync();
foreach (var warning in analysis.Warnings)
    Console.WriteLine($"Warning: {warning}");
```

### Go
```go
import "github.com/tantulabs/cascade-hardware-monitor/cascade"

client := cascade.NewClient()
snapshot, _ := client.GetSnapshot()
fmt.Printf("CPU: %.1f%%\n", snapshot.CPU.Load)

analysis, _ := client.AI.GetAnalysis()
for _, warning := range analysis.Warnings {
    fmt.Printf("Warning: %s\n", warning)
}
```

## Why Cascade over OpenHardwareMonitor?

| Feature | Cascade | OpenHardwareMonitor |
|---------|---------|---------------------|
| Cross-platform | ✅ Win/Mac/Linux | ❌ Windows only |
| REST API | ✅ Full JSON API | ❌ None |
| AI Integration | ✅ Built-in | ❌ None |
| Apple Silicon | ✅ Native | ❌ None |
| Multi-language SDKs | ✅ 5 languages | ❌ C# only |
| Active development | ✅ 2026+ | ❌ Abandoned |

## Documentation

- [AI Integration Guide](./AI_INTEGRATION.md)
- [API Documentation](https://tantulabs-cascade.web.app)
- [GitHub Repository](https://github.com/tantulabs/cascade-hardware-monitor)

## License

MIT License - TantuLabs
