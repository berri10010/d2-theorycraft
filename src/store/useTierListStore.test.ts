import { describe, it, expect, beforeEach } from 'vitest';
import { useTierListStore, DEFAULT_PVE, DEFAULT_PVP } from './useTierListStore';

const store = () => useTierListStore.getState();

// BUG_REPORT_2 N6: the store itself must keep its lists consistent; the panel only hides the unsafe buttons.
describe('tier list store protects itself', () => {
  beforeEach(() => {
    useTierListStore.setState({
      lists: { [DEFAULT_PVE]: {}, [DEFAULT_PVP]: {} },
      pveModeList: DEFAULT_PVE,
      pvpModeList: DEFAULT_PVP,
    });
  });

  it('createList does not replace an existing list of the same name', () => {
    store().setPerkTier(DEFAULT_PVE, 'Rampage', 'S');
    store().createList(DEFAULT_PVE);
    expect(store().lists[DEFAULT_PVE]['Rampage']?.tier).toBe('S');
  });

  it('createList ignores an empty or blank name, and adds a new list otherwise', () => {
    store().createList('');
    store().createList('   ');
    expect(Object.keys(store().lists)).toEqual([DEFAULT_PVE, DEFAULT_PVP]);
    store().createList('Mine');
    expect(store().lists['Mine']).toEqual({});
  });

  it('deleteList never removes the last remaining list', () => {
    store().deleteList(DEFAULT_PVP);
    expect(Object.keys(store().lists)).toEqual([DEFAULT_PVE]);
    store().deleteList(DEFAULT_PVE);
    expect(Object.keys(store().lists)).toEqual([DEFAULT_PVE]);
    expect(store().lists[store().pveModeList]).toBeDefined();
    expect(store().lists[store().pvpModeList]).toBeDefined();
  });

  it('deleteList moves a mode that pointed at the deleted list to one that exists', () => {
    store().createList('Mine');
    store().setActiveList('pve', 'Mine');
    store().deleteList('Mine');
    expect(store().pveModeList).toBe(DEFAULT_PVE);
    expect(store().lists[store().pveModeList]).toBeDefined();
  });

  it('deleteList ignores a name that does not exist', () => {
    store().deleteList('Nope');
    expect(Object.keys(store().lists)).toEqual([DEFAULT_PVE, DEFAULT_PVP]);
  });
});
