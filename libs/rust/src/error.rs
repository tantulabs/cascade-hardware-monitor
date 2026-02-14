//! Error types for Cascade Hardware Monitor

use thiserror::Error;

#[derive(Error, Debug)]
pub enum CascadeError {
    #[error("Connection failed: {0}")]
    Connection(#[from] reqwest::Error),

    #[error("API error: {0}")]
    Api(String),

    #[error("JSON parsing error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}
