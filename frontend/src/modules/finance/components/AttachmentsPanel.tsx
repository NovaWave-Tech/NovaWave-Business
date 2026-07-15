import {
  Box,
  Button,
  Flex,
  IconButton,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { EmptyState, Surface } from '../../../shared/ui/ErpUI';
import { formatDateTime } from '../../../shared/utils/formatters';
import {
  financeService,
  type FinanceDetail,
  type FinanceType,
} from '../services/financeService';

/** Boletos, notas e comprovantes do lancamento: enviar, baixar e remover. */
export function AttachmentsPanel({
  type,
  id,
  attachments,
  canEdit,
}: {
  type: FinanceType;
  id: number;
  attachments: FinanceDetail['attachments'];
  canEdit: boolean;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () =>
    client.invalidateQueries({ queryKey: ['finance-detail'] });
  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });

  const upload = useMutation({
    mutationFn: (file: File) => financeService.uploadAttachment(type, id, file),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Anexo enviado', status: 'success' });
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: (attachment: number) =>
      financeService.deleteAttachment(type, id, attachment),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Anexo removido', status: 'success' });
    },
    onError: notifyError,
  });
  const download = useMutation({
    mutationFn: ({ attachment, nome }: { attachment: number; nome: string }) =>
      financeService.downloadAttachment(type, id, attachment, nome),
    onError: notifyError,
  });

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) upload.mutate(file);
    event.target.value = '';
  };

  return (
    <Box>
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,.xml,.png,.jpg,.jpeg,.webp"
            onChange={pick}
          />
          <Button
            size="sm"
            variant="outline"
            w="full"
            mb={3}
            leftIcon={<Upload size={14} />}
            isLoading={upload.isPending}
            loadingText="Enviando..."
            onClick={() => inputRef.current?.click()}
          >
            Enviar anexo
          </Button>
          <Text mb={3} fontSize="11px" color="erp.textMuted" textAlign="center">
            PDF, XML ou imagem (png, jpg, webp) · ate 10 MB
          </Text>
        </>
      )}

      {attachments.length === 0 ? (
        <EmptyState
          title="Sem anexos"
          description={
            canEdit
              ? 'Envie o boleto, a nota ou o comprovante deste lancamento.'
              : 'Boletos, notas e comprovantes aparecerao aqui.'
          }
          icon={Paperclip}
        />
      ) : (
        attachments.map(attachment => (
          <Surface key={attachment.idanexo} p={3} mb={2}>
            <Flex align="center" gap={3}>
              <FileText size={16} />
              <Box flex="1" minW={0}>
                <Text fontSize="12px" fontWeight="600" noOfLines={1}>
                  {attachment.nome}
                </Text>
                <Text fontSize="10px" color="erp.textMuted">
                  {formatDateTime(attachment.criado_em)}
                </Text>
              </Box>
              <Flex gap={1} flexShrink={0}>
                <Tooltip label="Baixar">
                  <IconButton
                    aria-label="Baixar anexo"
                    icon={<Download size={14} />}
                    size="sm"
                    variant="ghost"
                    isLoading={
                      download.isPending &&
                      download.variables?.attachment === attachment.idanexo
                    }
                    onClick={() =>
                      download.mutate({
                        attachment: attachment.idanexo,
                        nome: attachment.nome,
                      })
                    }
                  />
                </Tooltip>
                {canEdit && (
                  <Tooltip label="Remover">
                    <IconButton
                      aria-label="Remover anexo"
                      icon={<Trash2 size={14} />}
                      size="sm"
                      variant="ghost"
                      color="erp.danger"
                      isLoading={
                        remove.isPending &&
                        remove.variables === attachment.idanexo
                      }
                      onClick={() => remove.mutate(attachment.idanexo)}
                    />
                  </Tooltip>
                )}
              </Flex>
            </Flex>
          </Surface>
        ))
      )}
    </Box>
  );
}
