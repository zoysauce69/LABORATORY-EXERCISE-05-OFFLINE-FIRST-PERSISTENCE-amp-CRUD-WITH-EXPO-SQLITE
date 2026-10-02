import { fail, ok, runQuery, type Result } from '@/lib/errors';
import { supabase, storageBuckets } from '@/lib/supabase';
import type { VerificationRequestInsert, VerificationRequestRow } from '@/lib/database.types';

export interface VerificationSubmission {
  fullLegalName: string;
  address: string;
  idType: 'philippine_id' | 'passport' | 'drivers_license' | 'other';
  /** Last 2-4 characters only. Never the full number. */
  idNumberLast4: string;
  submittedNotes?: string | undefined;
  /** Object key inside the private bucket, when a document was attached. */
  documentStoragePath?: string | undefined;
}

export const verificationService = {
  /**
   * Submits a verification request for review.
   *
   * There is deliberately no update or cancel path: an admin decides the outcome
   * through `admin_review_verification`.
   */
  async submit(landlordId: string, submission: VerificationSubmission): Promise<Result<VerificationRequestRow>> {
    const existing = await runQuery('Check existing request', () =>
      supabase
        .from('landlord_verification_requests')
        .select('id, status')
        .eq('landlord_id', landlordId)
        .eq('status', 'pending')
        .maybeSingle(),
    );

    if (!existing.ok) return existing;

    if (existing.data) {
      return fail(
        'You already have a verification request under review. We will notify you once it is decided.',
        'already_pending',
      );
    }

    const payload: VerificationRequestInsert = {
      landlord_id: landlordId,
      full_legal_name: submission.fullLegalName,
      address: submission.address,
      id_type: submission.idType,
      id_number_last4: submission.idNumberLast4,
      submitted_notes: submission.submittedNotes?.trim() ? submission.submittedNotes.trim() : null,
      document_storage_path: submission.documentStoragePath ?? null,
    };

    return runQuery('Submit verification', () =>
      supabase.from('landlord_verification_requests').insert(payload).select('*').single(),
    );
  },

  /** History for this landlord, newest first. */
  async listForLandlord(landlordId: string): Promise<Result<VerificationRequestRow[]>> {
    return runQuery('Load verification history', () =>
      supabase
        .from('landlord_verification_requests')
        .select('*')
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false }),
    );
  },

  /**
   * Uploads an ID document into the private bucket.
   *
   * The bucket is not public and has no public read policy, so the file is only
   * reachable through a signed URL issued after an administrator check.
   */
  async uploadDocument(userId: string, fileName: string, base64: string): Promise<Result<string>> {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const objectPath = `${userId}/${Date.now()}-id.${extension}`;

    const result = await runQuery('Upload document', () =>
      supabase.storage
        .from(storageBuckets.verificationDocuments)
        .upload(objectPath, base64, { contentType: 'image/jpeg', upsert: false })
        .then((res) => ({ data: { path: objectPath }, error: res.error })),
    );

    if (!result.ok) return result;
    return ok(result.data.path);
  },

  /**
   * Admin-only review. The RPC refuses when the reviewer is the applicant, so a
   * Verified badge cannot be self-issued even with an admin account.
   */
  async review(
    requestId: string,
    decision: 'verified' | 'rejected',
    notes?: string | undefined,
  ): Promise<Result<VerificationRequestRow>> {
    return runQuery('Review verification', () =>
      supabase
        .rpc('admin_review_verification', {
          p_request_id: requestId,
          p_decision: decision,
          p_notes: notes ?? null,
        })
        .then((res) => ({ data: res.data as VerificationRequestRow, error: res.error })),
    );
  },

  /** Pending queue for administrators. */
  async listPending(): Promise<Result<VerificationRequestRow[]>> {
    return runQuery('Load review queue', () =>
      supabase
        .from('landlord_verification_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    );
  },
};