// src/services/transactionService.js
import { supabase } from '../config/supabase';

export const transactionService = {
  // ALGORITHM 1: Submit Borrowing Request[cite: 80, 81]
  async submitRequest(userId, assetId, startDate, endDate, purpose) {
    // Check if the asset is currently available and borrowable
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('status, is_borrowable')
      .eq('id', assetId)
      .single();

    if (assetError) throw assetError;
    if (asset.status !== 'Available' || !asset.is_borrowable) {
      throw new Error('This asset is currently not available for borrowing.');
    }

    // Insert the pending request
    const { data, error } = await supabase
      .from('borrowing_requests')
      .insert([
        {
          borrower_id: userId,
          asset_id: assetId,
          requested_from: startDate,
          requested_to: endDate,
          purpose: purpose,
          status: 'Pending'
        }
      ]);

    if (error) throw error;
    return data;
  },

  // ALGORITHM 2: Approve Request and Issue Equipment[cite: 81]
  // Note: The documentation separates approval from issuance, but we handle the issuance step here to change the asset status.
  async issueEquipment(requestId, adminId, assetId, expectedReturnDate, condition) {
    // 1. Update the request status to Approved
    await supabase
      .from('borrowing_requests')
      .update({ status: 'Approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    // 2. Create the active transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([
        {
          request_id: requestId,
          asset_id: assetId,
          issued_by: adminId,
          expected_return_date: expectedReturnDate,
          issue_condition: condition,
          status: 'Active'
        }
      ]);

    if (txError) throw txError;

    // 3. Update asset status to 'On Loan'
    const { error: assetUpdateError } = await supabase
      .from('assets')
      .update({ status: 'On Loan' })
      .eq('id', assetId);

    if (assetUpdateError) throw assetUpdateError;

    return transaction;
  },

  // ALGORITHM 3: Return Equipment[cite: 81, 82]
  async returnEquipment(transactionId, assetId, returnCondition, isDamaged) {
    const returnDate = new Date().toISOString();
    
    // 1. Mark transaction as Returned
    const { error: txError } = await supabase
      .from('transactions')
      .update({ 
        actual_return_date: returnDate, 
        return_condition: returnCondition,
        status: 'Returned' 
      })
      .eq('id', transactionId);

    if (txError) throw txError;

    // 2. Update asset status based on returned condition
    const newAssetStatus = isDamaged ? 'Under Maintenance' : 'Available';
    const { error: assetUpdateError } = await supabase
      .from('assets')
      .update({ status: newAssetStatus, condition: returnCondition })
      .eq('id', assetId);

    if (assetUpdateError) throw assetUpdateError;

    return true;
  }
};