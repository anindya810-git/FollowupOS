export const DEFAULT_FOLLOWUP_TEMPLATE = `Hi {{name}},

Just following up on my previous message — wanted to make sure it didn't slip through. Whenever you have a moment, I'd appreciate your thoughts.

Thanks!`

export function renderTemplate(
  template: string,
  vars: { name?: string; firstName?: string },
): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name ?? 'there')
    .replace(/\{\{firstName\}\}/g, vars.firstName ?? vars.name?.split(' ')[0] ?? 'there')
}
