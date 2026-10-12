/**
 * Cờ bật dữ liệu demo (mocks/demo-data.ts) thay vì gọi API thật.
 * Bật qua NEXT_PUBLIC_USE_MOCKS=true để chạy demo / dựng UI song song với backend.
 */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true"

export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === "true"
