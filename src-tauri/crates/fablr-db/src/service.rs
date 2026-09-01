use std::sync::Arc;
use crate::Db;

/// 项目与持久化服务句柄（持有 Db 引用，方便跨 crate 注入）
#[derive(Clone)]
pub struct ProjectService {
    db: Arc<Db>,
}

impl ProjectService {
    pub fn new(db: Arc<Db>) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &Db {
        &self.db
    }
}
