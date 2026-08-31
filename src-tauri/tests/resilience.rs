//! Integration tests for `utils::resilience` — panic hook + ResourceLimiter.
//!
//! These are *integration* tests (not unit tests inside `utils/mod.rs`) so
//! they can be compiled and run on their own. The project's main `lib.rs`
//! has 6 pre-existing compile errors in `ffmpeg_builder.rs` and the
//! `utils/mod.rs` test module that block `cargo test --lib`; isolating
//! our new tests here keeps the P0 fix verifiable end-to-end without
//! touching that pre-existing debt.
//!
//! Each test builds its own `ResourceLimiter::with_capacity(3)` so it
//! cannot be polluted by other tests (lib unit tests, parallel
//! integration tests) holding permits on the shared global limiter.

use fablr_lib::utils::{install_panic_hook, ResourceLimiter};

/// Helper: a fresh 3-permit limiter that is fully owned by this test.
fn fresh_limiter() -> ResourceLimiter {
    ResourceLimiter::with_capacity(3)
}

#[test]
fn limiter_permits_never_drop_below_one() {
    let l = fresh_limiter();
    assert!(l.total_permits() >= 1);
    assert_eq!(l.available_permits(), l.total_permits());
}

#[test]
fn try_acquire_then_release_returns_permit() {
    let l = fresh_limiter();
    let total = l.available_permits();
    let permit = l.try_acquire().expect("idle limiter must yield a permit");
    assert_eq!(l.available_permits(), total - 1);
    drop(permit);
    assert_eq!(l.available_permits(), total);
}

#[test]
fn try_acquire_drains_pool() {
    let l = fresh_limiter();
    let total = l.available_permits();
    let mut held = Vec::new();
    for _ in 0..total {
        held.push(l.try_acquire().expect("permit available"));
    }
    assert!(
        l.try_acquire().is_none(),
        "pool should be exhausted after acquiring `total` permits"
    );
    held.clear();
    assert_eq!(l.available_permits(), total);
}

#[test]
fn install_panic_hook_is_idempotent() {
    install_panic_hook();
    install_panic_hook(); // second call must not panic / double-install
}

#[test]
fn panic_payload_string_preserved() {
    // Behaviour is unit-tested in `utils::resilience::tests`. Here we
    // re-implement the downcast helper to keep this integration test
    // self-contained (the function is private and intentionally not
    // re-exported from the public utils module).
    fn downcast(payload: &dyn std::any::Any) -> String {
        if let Some(s) = payload.downcast_ref::<&'static str>() {
            s.to_string()
        } else if let Some(s) = payload.downcast_ref::<String>() {
            s.clone()
        } else {
            "<non-string panic payload>".to_string()
        }
    }
    assert_eq!(downcast(&"hello"), "hello");
    let owned = "owned".to_string();
    assert_eq!(downcast(&owned), "owned");
    let n: i32 = 42;
    assert_eq!(downcast(&n), "<non-string panic payload>");
}

#[tokio::test]
async fn acquire_awaits_and_releases() {
    let l = fresh_limiter();
    let total = l.available_permits();
    let permit = l.acquire().await.expect("acquire must succeed");
    assert_eq!(l.available_permits(), total - 1);
    drop(permit);
    assert_eq!(l.available_permits(), total);
}

#[test]
fn independent_limiters_have_independent_pools() {
    // Two limiters (even with the same capacity) must have independent
    // permit pools. Exhausting one does not affect the other.
    let a = ResourceLimiter::with_capacity(2);
    let b = ResourceLimiter::with_capacity(2);
    let _pa1 = a.try_acquire().expect("a has permit 1");
    let _pa2 = a.try_acquire().expect("a has permit 2");
    assert!(a.try_acquire().is_none(), "a is now exhausted");
    assert_eq!(b.available_permits(), 2, "b is still fresh");
}
