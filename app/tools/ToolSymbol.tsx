import type { EquipmentKind } from './prototype';
import { EquipmentIcon } from './EquipmentIcon';
import s from './tools.module.css';
export function ToolSymbol({ kind, imageUrl, name }: { kind: EquipmentKind; imageUrl?: string; name?: string }) {
  return <span className={s.toolSymbol} data-equipment={kind} data-family="technical" data-photo={imageUrl ? 'true' : 'false'}>{imageUrl ? /* Local object URLs intentionally bypass the remote image optimizer. */
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={name ? `${name} photograph` : 'Equipment photograph'} /> : <EquipmentIcon kind={kind} family="technical" size={40} />}</span>;
}
