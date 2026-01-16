export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-nano-navy-900">
      <div className="text-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-nano-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-400 text-sm animate-pulse">Cargando...</p>
      </div>
    </div>
  )
}
