type Props = {
  message?: string
}

export function ForbiddenState({ message }: Props) {
  return (
    <div className="rounded-lg border border-nano-blue-500/20 bg-nano-navy-900/50 p-6 text-center shadow-lg backdrop-blur-sm">
      <div className="text-lg font-bold text-white mb-2">403 - Acceso denegado</div>
      <div className="text-sm text-slate-400">
        {message ?? 'No tienes los permisos necesarios para acceder a esta sección de ChefOS.'}
      </div>
    </div>
  )
}
