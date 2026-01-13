export function computeAvailableOnHand(onHand: number, reservedOthers: number) {
  return Math.max(0, onHand - Math.max(0, reservedOthers))
}

export function detectReservationConflicts(onHand: number, reservedTotal: number) {
  const shortage = Math.max(0, reservedTotal - onHand)
  return {
    shortage,
    hasConflict: shortage > 0,
  }
}
