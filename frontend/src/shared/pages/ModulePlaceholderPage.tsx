import { Box } from '@chakra-ui/react';
import { Construction } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, PageHeader, Surface } from '../ui/ErpUI';

type ModulePlaceholderPageProps = { title: string; description: string };

export default function ModulePlaceholderPage({
  title,
  description,
}: ModulePlaceholderPageProps) {
  const navigate = useNavigate();
  return (
    <Box>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'ERP', to: '/dashboard' }, { label: title }]}
      />
      <Surface>
        <EmptyState
          title={`${title} em preparacao`}
          description="A estrutura de navegacao esta pronta. Os dados e operacoes deste modulo serao disponibilizados conforme o desenvolvimento funcional."
          icon={Construction}
          action={() => navigate('/dashboard')}
          actionLabel="Voltar ao dashboard"
        />
      </Surface>
    </Box>
  );
}
