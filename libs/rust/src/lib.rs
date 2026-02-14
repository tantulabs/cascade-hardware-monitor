//! # Cascade Hardware Monitor - Rust Client
//!
//! Modern, AI-friendly hardware monitoring library. Superior alternative to
//! OpenHardwareMonitor with cross-platform support (Windows, macOS, Linux).
//!
//! ## Features
//! - Real-time CPU, GPU, memory, storage, network monitoring
//! - Per-core CPU temperatures, frequencies, and loads
//! - Multi-GPU support (NVIDIA, AMD, Intel, Apple Silicon)
//! - AI-friendly structured data with health scores
//! - Hardware control capabilities
//!
//! ## Quick Start
//! ```rust
//! use cascade_hardware_monitor::CascadeClient;
//!
//! fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let client = CascadeClient::new("localhost", 8085)?;
//!     
//!     let snapshot = client.get_snapshot()?;
//!     println!("CPU Load: {}%", snapshot.cpu.load);
//!     
//!     let analysis = client.ai().get_analysis()?;
//!     for warning in analysis.warnings {
//!         println!("Warning: {}", warning);
//!     }
//!     
//!     Ok(())
//! }
//! ```

pub mod client;
pub mod models;
pub mod error;

pub use client::CascadeClient;
pub use models::*;
pub use error::CascadeError;
