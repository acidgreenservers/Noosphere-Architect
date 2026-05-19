## 2026-05-19 - [Large Bundle Size Bottleneck]
**Learning:** The application bundle was exceeding 500kB because all major tool components were imported synchronously in App.tsx, regardless of the active view.
**Action:** Implement code splitting using React.lazy and Suspense for all top-level tool components to ensure only the necessary code is loaded initially.
