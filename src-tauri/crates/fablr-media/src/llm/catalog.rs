use std::sync::OnceLock;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub context_limit: usize,
}

static MODEL_CATALOG: OnceLock<Vec<ModelInfo>> = OnceLock::new();

pub fn get_model_catalog() -> &'static Vec<ModelInfo> {
    MODEL_CATALOG.get_or_init(|| {
        let raw = include_str!("models.json");
        serde_json::from_str(raw).expect("Failed to parse llm/models.json")
    })
}
