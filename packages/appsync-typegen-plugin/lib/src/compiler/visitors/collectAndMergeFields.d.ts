import { SelectionSet, Selection, Field, BooleanCondition } from '../';
declare module '../' {
  interface Field {
    conditions?: BooleanCondition[];
  }
}
export declare function collectAndMergeFields(selectionSet: SelectionSet, mergeInFragmentSpreads?: Boolean): Field[];
export declare function wrapInBooleanConditionsIfNeeded(selections: Selection[], conditions?: BooleanCondition[]): Selection[];
//# sourceMappingURL=collectAndMergeFields.d.ts.map
