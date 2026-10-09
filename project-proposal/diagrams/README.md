# SRS Diagrams

Six standalone TikZ sources, one per SRS figure. Each uses the
`standalone` document class, so compiling produces a **single, tightly
cropped page** — ideal for exporting to JPG.

| File | SRS Figure |
|------|------------|
| `fig1-workflow.tex` | Figure 1 — Entire work-flow |
| `fig2-users.tex` | Figure 2 — Types of users |
| `fig3-dataflow.tex` | Figure 3 — Data model / entities |
| `fig4-student-activities.tex` | Figure 4 — Student Activities |
| `fig5-admin-activities.tex` | Figure 5 — Hostel-Administrator Activities |
| `fig6-staff-activities.tex` | Figure 6 — Counter Staff Activities |

## How to turn each into a JPG

1. Create a **new blank Overleaf project** (or a local LaTeX editor).
2. Paste one file's contents and **Recompile** — you get a one-page PDF
   cropped to the diagram.
3. Convert that one-page PDF to an image:
   - In Overleaf: **Download PDF**, then use any "PDF to JPG" tool, or
   - take a screenshot of the rendered diagram.
4. Save as e.g. `workflow.jpg`, `users.jpg`, `dfd.jpg`,
   `student-activities.jpg`, `admin-activities.jpg`,
   `staff-activities.jpg`.
5. Upload those JPGs into your SRS Overleaf project and uncomment the
   matching `% ----- FIGURE n` block in `srs.tex`.

> Tip: `\documentclass[border=12pt]{standalone}` controls the white
> margin around the diagram; increase/decrease the `12pt` to taste.
