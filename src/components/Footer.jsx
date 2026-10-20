const year = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6 text-center text-sm text-muted">
      © {year} Lephas. All rights reserved.
    </footer>
  )
}
