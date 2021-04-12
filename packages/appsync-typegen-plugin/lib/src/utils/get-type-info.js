'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getTypeInfo = void 0;
function getTypeInfo(typeNode, schema) {
  if (typeNode.kind === 'NamedType') {
    return {
      type: typeNode.name.value,
      isNullable: true,
      isList: false,
      baseType: schema.getType(typeNode.name.value),
    };
  } else if (typeNode.kind === 'NonNullType' && typeNode.type.kind === 'ListType') {
    return {
      ...getTypeInfo(typeNode.type.type, schema),
      isList: true,
      isListNullable: false,
    };
  } else if (typeNode.kind === 'NonNullType') {
    return {
      ...getTypeInfo(typeNode.type, schema),
      isNullable: false,
    };
  } else if (typeNode.kind === 'ListType') {
    return {
      ...getTypeInfo(typeNode.type, schema),
      isList: true,
      isListNullable: true,
    };
  }
  return {
    isList: false,
    isNullable: false,
    type: typeNode,
  };
}
exports.getTypeInfo = getTypeInfo;
//# sourceMappingURL=get-type-info.js.map
