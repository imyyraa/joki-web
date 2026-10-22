// Tab game kini ada di sidebar (komponen/panel-sidebar.tsx).
export default function Navigasi({ aktif }: { aktif: string }) {
  return <span hidden data-aktif={aktif} />
}