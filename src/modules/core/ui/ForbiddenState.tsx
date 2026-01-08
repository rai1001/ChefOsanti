type Props = {
  message?: string
}

export function ForbiddenState({ message }: Props) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
      <div className="text-lg font-semibold">403 · Acceso denegado</div>
      <div className="text-sm text-rose-600">
        {message ?? 'No tienes permisos para acceder a esta sección.'}
      </div>
    </div>
  )
}
