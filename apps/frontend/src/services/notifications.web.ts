export function configureNotifications() {}
export function listenForAlertConfirmation(_onConfirmed: () => void) { return { remove() {} }; }
export async function cancelPendingAlerts() {}
export async function scheduleRepeatedFrostAlerts(_hour: number, _minute: number, _title: string, _body: string) { return 0; }
