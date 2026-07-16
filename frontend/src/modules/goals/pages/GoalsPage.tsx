import {
  Badge,
  Box,
  Flex,
  IconButton,
  Progress,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import {
  EmptyState,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { useAuth } from '../../../shared/auth/AuthContext';
import {
  formatCurrency,
  formatMonthYear,
} from '../../../shared/utils/formatters';
import { GoalRow } from '../components/GoalRow';
import { goalService, type GoalScope } from '../services/goalService';

/** Desloca a competencia 'YYYY-MM' em N meses. */
function shiftMonth(competencia: string, delta: number): string {
  const [year, month] = competencia.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function GoalsPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const canEdit = can('configuracao:editar');
  const [competencia, setCompetencia] = useState(currentMonth());

  const query = useQuery({
    queryKey: ['goals', competencia],
    queryFn: () => goalService.list(competencia),
  });
  const data = query.data;

  const save = useMutation({
    mutationFn: (payload: {
      escopo: GoalScope;
      id?: number;
      valor_meta: number;
    }) => goalService.save({ ...payload, competencia }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['goals'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const companyPct =
    data && data.company.meta > 0
      ? Math.min(100, (data.company.realizado / data.company.meta) * 100)
      : 0;

  return (
    <Box>
      <PageHeader
        icon={Target}
        title="Metas de venda"
        description="Defina metas por filial e por vendedor e acompanhe o realizado do mes."
        breadcrumbs={[{ label: 'Gestao' }, { label: 'Metas' }]}
        actions={
          <Flex align="center" gap={1}>
            <IconButton
              aria-label="Mes anterior"
              icon={<ChevronLeft size={18} />}
              variant="outline"
              onClick={() => setCompetencia(c => shiftMonth(c, -1))}
            />
            <Box
              minW="150px"
              textAlign="center"
              px={3}
              py={2}
              borderRadius="8px"
              bg="erp.surfaceSubtle"
              fontWeight="700"
              fontSize="14px"
            >
              {formatMonthYear(`${competencia}-01`)}
            </Box>
            <IconButton
              aria-label="Proximo mes"
              icon={<ChevronRight size={18} />}
              variant="outline"
              onClick={() => setCompetencia(c => shiftMonth(c, 1))}
            />
          </Flex>
        }
      />

      {query.isLoading || !data ? (
        <Flex justify="center" py={20}>
          <Spinner color="brand.500" size="lg" />
        </Flex>
      ) : (
        <>
          <Surface p={5} mb={5}>
            <Flex justify="space-between" align="center" gap={3} wrap="wrap">
              <Box>
                <Text textStyle="overline" color="erp.textMuted">
                  Meta da empresa
                </Text>
                <Text fontSize="12px" color="erp.textSecondary">
                  Definida em Configuracoes · meta mensal unica
                </Text>
              </Box>
              <Box textAlign="right">
                <Text textStyle="numeric" fontSize="22px" fontWeight="800">
                  {formatCurrency(data.company.realizado)}
                </Text>
                <Text fontSize="12px" color="erp.textMuted">
                  de {formatCurrency(data.company.meta)}
                </Text>
              </Box>
            </Flex>
            <Flex mt={3} align="center" gap={3}>
              <Progress
                flex="1"
                value={companyPct}
                borderRadius="full"
                size="sm"
                colorScheme={companyPct >= 100 ? 'green' : 'blue'}
              />
              <Badge
                colorScheme={companyPct >= 100 ? 'green' : 'blue'}
                borderRadius="full"
              >
                {companyPct.toFixed(0)}%
              </Badge>
            </Flex>
          </Surface>

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
            <Surface overflow="hidden">
              <SectionHeader
                icon={Building2}
                eyebrow="Por filial"
                title="Metas das filiais"
              />
              <Box p={4}>
                {data.branches.length === 0 ? (
                  <EmptyState title="Sem filiais ativas" icon={Building2} />
                ) : (
                  data.branches.map(branch => (
                    <GoalRow
                      key={branch.idfilial}
                      nome={branch.nome}
                      meta={branch.meta}
                      realizado={branch.realizado}
                      canEdit={canEdit}
                      saving={
                        save.isPending &&
                        save.variables?.escopo === 'branch' &&
                        save.variables?.id === branch.idfilial
                      }
                      onSave={valor_meta =>
                        save.mutate({
                          escopo: 'branch',
                          id: branch.idfilial,
                          valor_meta,
                        })
                      }
                    />
                  ))
                )}
              </Box>
            </Surface>

            <Surface overflow="hidden">
              <SectionHeader
                icon={Users}
                eyebrow="Por vendedor"
                title="Metas dos vendedores"
              />
              <Box p={4}>
                {data.sellers.length === 0 ? (
                  <EmptyState title="Sem vendedores ativos" icon={Users} />
                ) : (
                  data.sellers.map(seller => (
                    <GoalRow
                      key={seller.idusuario}
                      nome={seller.nome}
                      meta={seller.meta}
                      realizado={seller.realizado}
                      canEdit={canEdit}
                      saving={
                        save.isPending &&
                        save.variables?.escopo === 'seller' &&
                        save.variables?.id === seller.idusuario
                      }
                      onSave={valor_meta =>
                        save.mutate({
                          escopo: 'seller',
                          id: seller.idusuario,
                          valor_meta,
                        })
                      }
                    />
                  ))
                )}
              </Box>
            </Surface>
          </SimpleGrid>
        </>
      )}
    </Box>
  );
}
