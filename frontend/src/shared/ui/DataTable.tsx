import {
  Box,
  Checkbox,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  Select,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tooltip,
} from '@chakra-ui/react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState, Surface } from './ErpUI';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sortValue?: (item: T) => string | number;
  numeric?: boolean;
  width?: string;
};
type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (item: T) => string | number;
  searchText?: (item: T) => string;
  searchPlaceholder?: string;
  loading?: boolean;
  pageSize?: number;
  selectable?: boolean;
  filters?: ReactNode;
  bulkActions?: (selected: T[]) => ReactNode;
  rowActions?: (item: T) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = 'Buscar registros',
  loading = false,
  pageSize = 10,
  selectable = false,
  filters,
  bulkActions,
  rowActions,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set()
  );
  const filtered = useMemo(
    () =>
      query && searchText
        ? data.filter(item =>
            searchText(item).toLowerCase().includes(query.toLowerCase())
          )
        : data,
    [data, query, searchText]
  );
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find(item => item.key === sort.key);
    if (!column?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const left = column.sortValue?.(a) ?? '';
      const right = column.sortValue?.(b) ?? '';
      return (
        String(left).localeCompare(String(right), 'pt-BR', { numeric: true }) *
        (sort.direction === 'asc' ? 1 : -1)
      );
    });
  }, [columns, filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = data.filter(item => selectedKeys.has(rowKey(item)));
  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return;
    setSort(current =>
      current?.key === column.key
        ? {
            key: column.key,
            direction: current.direction === 'asc' ? 'desc' : 'asc',
          }
        : { key: column.key, direction: 'asc' }
    );
  };
  const toggleAll = () =>
    setSelectedKeys(current =>
      visible.every(item => current.has(rowKey(item)))
        ? new Set()
        : new Set(visible.map(rowKey))
    );
  const toggleOne = (item: T) =>
    setSelectedKeys(current => {
      const next = new Set(current);
      const key = rowKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Box>
      <Flex
        gap={3}
        mb={4}
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
      >
        <InputGroup maxW={{ md: '360px' }}>
          <InputLeftElement pointerEvents="none">
            <Search size={16} />
          </InputLeftElement>
          <Input
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            bg="erp.surface"
          />
        </InputGroup>
        <Flex gap={2} direction={{ base: 'column', sm: 'row' }}>
          {filters}
          {selected.length > 0 && bulkActions?.(selected)}
        </Flex>
      </Flex>
      <Surface overflow="hidden">
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                {selectable && (
                  <Th w="44px">
                    <Checkbox
                      isChecked={
                        visible.length > 0 &&
                        visible.every(item => selectedKeys.has(rowKey(item)))
                      }
                      isIndeterminate={
                        visible.some(item => selectedKeys.has(rowKey(item))) &&
                        !visible.every(item => selectedKeys.has(rowKey(item)))
                      }
                      onChange={toggleAll}
                      aria-label="Selecionar pagina"
                    />
                  </Th>
                )}
                {columns.map(column => (
                  <Th
                    key={column.key}
                    isNumeric={column.numeric}
                    w={column.width}
                  >
                    {column.sortValue ? (
                      <Flex
                        as="button"
                        align="center"
                        gap={1.5}
                        ml={column.numeric ? 'auto' : 0}
                        onClick={() => toggleSort(column)}
                      >
                        {column.label}
                        <ArrowUpDown size={12} />
                      </Flex>
                    ) : (
                      column.label
                    )}
                  </Th>
                ))}
                {rowActions && <Th w="52px" />}
              </Tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: Math.min(pageSize, 6) }).map(
                    (_, row) => (
                      <Tr key={row}>
                        {selectable && (
                          <Td>
                            <Skeleton boxSize="16px" />
                          </Td>
                        )}
                        {columns.map(column => (
                          <Td key={column.key}>
                            <Skeleton h="14px" />
                          </Td>
                        ))}
                        {rowActions && (
                          <Td>
                            <Skeleton boxSize="28px" />
                          </Td>
                        )}
                      </Tr>
                    )
                  )
                : visible.map(item => (
                    <Tr key={rowKey(item)}>
                      {selectable && (
                        <Td>
                          <Checkbox
                            isChecked={selectedKeys.has(rowKey(item))}
                            onChange={() => toggleOne(item)}
                            aria-label="Selecionar registro"
                          />
                        </Td>
                      )}
                      {columns.map(column => (
                        <Td key={column.key} isNumeric={column.numeric}>
                          {column.render(item)}
                        </Td>
                      ))}
                      {rowActions && (
                        <Td>
                          <Menu placement="bottom-end">
                            <Tooltip label="Acoes">
                              <MenuButton
                                as={IconButton}
                                aria-label="Acoes do registro"
                                icon={<MoreHorizontal size={17} />}
                                size="sm"
                                variant="ghost"
                              />
                            </Tooltip>
                            <MenuList>{rowActions(item)}</MenuList>
                          </Menu>
                        </Td>
                      )}
                    </Tr>
                  ))}
            </Tbody>
          </Table>
        </Box>
        {!loading && visible.length === 0 && (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
        <Flex
          px={4}
          py={3}
          align="center"
          justify="space-between"
          borderTop="1px solid"
          borderColor="erp.border"
        >
          <Text color="erp.textMuted" fontSize="12px">
            {sorted.length} {sorted.length === 1 ? 'registro' : 'registros'}
          </Text>
          <Flex align="center" gap={2}>
            <Select
              aria-label="Pagina atual"
              size="sm"
              w="74px"
              value={safePage}
              onChange={event => setPage(Number(event.target.value))}
            >
              {Array.from({ length: totalPages }).map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </Select>
            <IconButton
              aria-label="Pagina anterior"
              icon={<ChevronLeft size={16} />}
              size="sm"
              variant="outline"
              isDisabled={safePage <= 1}
              onClick={() => setPage(value => value - 1)}
            />
            <IconButton
              aria-label="Proxima pagina"
              icon={<ChevronRight size={16} />}
              size="sm"
              variant="outline"
              isDisabled={safePage >= totalPages}
              onClick={() => setPage(value => value + 1)}
            />
          </Flex>
        </Flex>
      </Surface>
    </Box>
  );
}
