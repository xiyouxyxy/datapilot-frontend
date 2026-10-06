// 权限判定纯函数：集中「通配 '*' / 精确码」的判定逻辑，供 store、守卫、权限组件复用并单测。

export function hasButton(buttons: readonly string[], code: string): boolean {
  return buttons.includes('*') || buttons.includes(code);
}

export function hasField(fields: readonly string[], code: string): boolean {
  return fields.includes('*') || fields.includes(code);
}

export function hasMenu(menus: readonly string[], key: string): boolean {
  return menus.includes('*') || menus.includes(key);
}
