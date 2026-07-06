import {
  Box,
  Checkbox,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import type { Catalog } from '../types/permissionTypes';

const permissionKey = (modulo: string, acao: string) => `${modulo}:${acao}`;

export default function PermissionMatrix({
  catalog,
  selected,
  onChange,
  readOnly = false,
}: {
  catalog: Catalog;
  selected: Set<string>;
  onChange?: (next: Set<string>) => void;
  readOnly?: boolean;
}) {
  const actionKeys = Object.keys(catalog.actions);

  const toggle = (modulo: string, acao: string) => {
    if (readOnly || !onChange) return;
    const next = new Set(selected);
    const key = permissionKey(modulo, acao);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };
  const toggleModule = (modulo: string, checked: boolean) => {
    if (readOnly || !onChange) return;
    const next = new Set(selected);
    actionKeys.forEach(acao => {
      const key = permissionKey(modulo, acao);
      if (checked) next.add(key);
      else next.delete(key);
    });
    onChange(next);
  };
  const toggleAction = (acao: string, checked: boolean) => {
    if (readOnly || !onChange) return;
    const next = new Set(selected);
    catalog.modules.forEach(module => {
      const key = permissionKey(module.modulo, acao);
      if (checked) next.add(key);
      else next.delete(key);
    });
    onChange(next);
  };

  const isModuleFull = (modulo: string) =>
    actionKeys.every(acao => selected.has(permissionKey(modulo, acao)));
  const isModulePartial = (modulo: string) =>
    !isModuleFull(modulo) &&
    actionKeys.some(acao => selected.has(permissionKey(modulo, acao)));
  const isActionFull = (acao: string) =>
    catalog.modules.every(module =>
      selected.has(permissionKey(module.modulo, acao))
    );
  const isActionPartial = (acao: string) =>
    !isActionFull(acao) &&
    catalog.modules.some(module =>
      selected.has(permissionKey(module.modulo, acao))
    );

  return (
    <Box
      overflowX="auto"
      border="1px solid"
      borderColor="erp.border"
      borderRadius="10px"
    >
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th whiteSpace="nowrap">Modulo</Th>
            {actionKeys.map(acao => (
              <Th key={acao} textAlign="center" whiteSpace="nowrap">
                <Flex direction="column" align="center" gap={1}>
                  <Text fontSize="10px">{catalog.actions[acao]}</Text>
                  {!readOnly && (
                    <Checkbox
                      isChecked={isActionFull(acao)}
                      isIndeterminate={isActionPartial(acao)}
                      onChange={event =>
                        toggleAction(acao, event.target.checked)
                      }
                      aria-label={`Selecionar ${catalog.actions[acao]} em todos os modulos`}
                    />
                  )}
                </Flex>
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {catalog.modules.map(module => (
            <Tr key={module.modulo}>
              <Td whiteSpace="nowrap">
                <Flex align="center" gap={2}>
                  {!readOnly && (
                    <Checkbox
                      isChecked={isModuleFull(module.modulo)}
                      isIndeterminate={isModulePartial(module.modulo)}
                      onChange={event =>
                        toggleModule(module.modulo, event.target.checked)
                      }
                      aria-label={`Selecionar todas as acoes de ${module.label}`}
                    />
                  )}
                  <Text fontWeight="600" fontSize="12px">
                    {module.label}
                  </Text>
                </Flex>
              </Td>
              {module.actions.map(action => (
                <Td key={action.acao} textAlign="center">
                  <Checkbox
                    isChecked={selected.has(
                      permissionKey(module.modulo, action.acao)
                    )}
                    isDisabled={readOnly}
                    onChange={() => toggle(module.modulo, action.acao)}
                    aria-label={`${action.label} em ${module.label}`}
                  />
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
