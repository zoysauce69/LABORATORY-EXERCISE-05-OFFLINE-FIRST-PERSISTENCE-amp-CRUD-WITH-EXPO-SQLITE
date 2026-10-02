import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/tab-screen-header';
import { RoommateStatusBadge } from '@/components/status-badge';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useAction } from '@/hooks/use-async-data';
import { useRoommateRequests } from '@/hooks/use-roommates';
import { roommateService } from '@/services/roommate-service';
import { fail, ok, type Result } from '@/lib/errors';
import type { RoommateRequestWithPerson } from '@/services/roommate-service';
import { formatTimeAgo } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

/**
 * Sent and received roommate requests.
 *
 * A request can only be answered by its receiver and withdrawn by its sender;
 * the buttons below mirror exactly those two cases rather than offering a
 * generic "cancel" that the database would refuse.
 */
export default function RoommateRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const requests = useRoommateRequests(user?.id);

  const respond = useAction(
    async (requestId: string, status: 'accepted' | 'declined'): Promise<Result<true>> => {
      if (!user) {
        return fail('Sign in again before answering this request.', 'not_signed_in');
      }

      const result = await roommateService.respondToRequest(requestId, user.id, status);
      if (!result.ok) return result;

      await requests.reload();
      return ok(true);
    },
  );

  const withdraw = useAction(async (requestId: string): Promise<Result<true>> => {
    if (!user) {
      return fail('Sign in again before withdrawing this request.', 'not_signed_in');
    }

    const result = await roommateService.withdrawRequest(requestId, user.id);
    if (!result.ok) return result;

    await requests.reload();
    return ok(true);
  });

  const refresh = useCallback(async () => {
    await requests.reload();
  }, [requests]);

  const rows = requests.data ?? [];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={requests.isLoading && !requests.isInitialLoading}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
      >
        <ScreenHeader title="Roommate requests" onBack={() => router.back()} />

        {respond.error ? <InlineAlert tone="danger" message={respond.error} /> : null}
        {withdraw.error ? <InlineAlert tone="danger" message={withdraw.error} /> : null}
        {requests.error ? <ErrorState message={requests.error} onRetry={requests.reload} /> : null}

        {requests.isInitialLoading ? (
          <LoadingState label="Loading requests" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="swap-horizontal-outline"
            title="No requests yet"
            message="When you send or receive a roommate request it will appear here."
            actionLabel="Browse roommates"
            onAction={() => router.replace('/(student)/(tabs)/roommates')}
          />
        ) : (
          rows.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              viewerId={user?.id ?? ''}
              busy={respond.isPending || withdraw.isPending}
              onOpenProfile={() => router.push(`/(student)/roommate/${otherId(request, user?.id)}`)}
              onRespond={(status) => void respond.run(request.id, status)}
              onWithdraw={() => void withdraw.run(request.id)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

interface RequestCardProps {
  request: RoommateRequestWithPerson;
  viewerId: string;
  busy: boolean;
  onOpenProfile: () => void;
  onRespond: (status: 'accepted' | 'declined') => void;
  onWithdraw: () => void;
}

function RequestCard({
  request,
  viewerId,
  busy,
  onOpenProfile,
  onRespond,
  onWithdraw,
}: RequestCardProps) {
  const isIncoming = request.receiver_id === viewerId;
  const other = isIncoming ? request.sender : request.receiver;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Avatar name={other?.full_name ?? 'Unknown'} uri={other?.avatar_url ?? null} size={40} />
        <View style={styles.headText}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {other?.full_name ?? 'Unknown'}
          </AppText>
          <AppText variant="caption">
            {isIncoming ? 'Wants to be your roommate' : 'You asked to be roommates'} ·{' '}
            {formatTimeAgo(request.created_at)}
          </AppText>
        </View>
        <RoommateStatusBadge status={request.status} compact />
      </View>

      {request.message ? (
        <View style={styles.message}>
          <Ionicons name="chatbox-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" style={styles.flex}>
            {request.message}
          </AppText>
        </View>
      ) : null}

      {request.status === 'pending' && isIncoming ? (
        <View style={styles.actions}>
          <Button
            label="Decline"
            variant="outline"
            size="sm"
            style={styles.flex}
            disabled={busy}
            onPress={() => onRespond('declined')}
          />
          <Button
            label="Accept"
            size="sm"
            style={styles.flex}
            disabled={busy}
            onPress={() => onRespond('accepted')}
          />
        </View>
      ) : null}

      {request.status === 'pending' && !isIncoming ? (
        <Button
          label="Withdraw request"
          variant="ghost"
          size="sm"
          disabled={busy}
          onPress={onWithdraw}
        />
      ) : null}

      {other ? (
        <Button label="View profile" variant="ghost" size="sm" icon="person-outline" onPress={onOpenProfile} />
      ) : null}
    </Card>
  );
}

function otherId(request: RoommateRequestWithPerson, viewerId: string | undefined): string {
  return request.receiver_id === viewerId ? request.sender_id : request.receiver_id;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge },
  card: { padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headText: { flex: 1, gap: 2 },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
});