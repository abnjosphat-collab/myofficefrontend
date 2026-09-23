import { describe, expect, it } from 'vitest';
import { historyReducer, type History } from './history';
import { attachmentError, applyMovement } from './prototype';
import { TEST_TOOLS as SEED_TOOLS } from './testFixtures';
const initial: History = { past: [], present: { tools: SEED_TOOLS, activity: [] }, future: [] };
describe('Preview recovery', () => {
  it('restores both the record and its activity when undoing an archive', () => {
    const archived = { tools: SEED_TOOLS.map((t,i) => i === 0 ? { ...t, archived: true } : t), activity: [{ id:'event', toolId:SEED_TOOLS[0].id, title:'Archived', detail:'Demo', time:'Now' }] };
    const saved = historyReducer(initial, { type:'save', snapshot:archived, label:'Archived' });
    const undone = historyReducer(saved, { type:'undo' });
    expect(undone.present).toEqual(initial.present);
    expect(historyReducer(undone, { type:'redo' }).present).toEqual(archived);
  });
  it('discards redo when a new edit follows an undo', () => {
    const saved = historyReducer(initial, { type:'save', snapshot:{...initial.present,tools:[]}, label:'Edit' });
    const undone = historyReducer(saved, {type:'undo'});
    const replaced = historyReducer(undone, {type:'save',snapshot:initial.present,label:'New edit'});
    expect(replaced.future).toHaveLength(0);
    expect(historyReducer(replaced,{type:'redo'})).toBe(replaced);
  });
  it('keeps empty history actions harmless', () => {
    expect(historyReducer(initial,{type:'undo'})).toBe(initial);
    expect(historyReducer(initial,{type:'redo'})).toBe(initial);
  });
  it('keeps records with unverified calibration unavailable', () => {
    const returned = applyMovement(SEED_TOOLS[1], {kind:'return',toolId:SEED_TOOLS[1].id,person:'',location:'Workshop',due:'',job:'',condition:'Good',notes:'',calibration:'Not verified'});
    expect(returned.status).toBe('attention');
  });
});
describe('Local evidence validation', () => {
  it('accepts common photos and PDFs', () => {
    for (const type of ['image/jpeg','image/png','image/webp','application/pdf']) expect(attachmentError({type,size:1024})).toBeNull();
  });
  it('rejects active content and empty files while retaining the PDF limit', () => {
    expect(attachmentError({type:'image/svg+xml',size:1024})).toContain('Choose a JPG');
    expect(attachmentError({type:'application/pdf',size:0})).toContain('empty');
    expect(attachmentError({type:'image/jpeg',size:25*1024*1024})).toBeNull();
    expect(attachmentError({type:'application/pdf',size:10*1024*1024+1})).toContain('PDF smaller than 10 MB');
  });
});
