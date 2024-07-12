class stringConst {
  constructor() {
    this.superAdmin = 'superAdmin';
    this.createSubAdmin = 'Create-SubAdmin';
    this.createIntroducer = 'Create-Introducer';
    this.createAdmin = 'Create-Admin';
    this.userProfileView = 'User-Profile-View';
    this.profileView = 'Profile-View';
    this.dashboardView = 'Dashboard-View';
    this.transactionView = 'Transaction-View'
    this.transactionEditRequest = 'Transaction-Edit-Request';
    this.transactionDeleteRequest = 'Transaction-Delete-Request';
    this.websiteView = 'Website-View';
    this.bankView = 'Bank-View';
    this.introducerProfileView = 'Introducer-Profile-View';
    this.createDepositTransaction = 'Create-Deposit-Transaction';
    this.createWithdrawTransaction = 'Create-Withdraw-Transaction';
    this.createTransaction = 'Create-Transaction';
    this.createUser = 'Create-User';
    this.transactionEditRequest = 'Transaction-Edit-Request';
    this.transactionDeleteRequest = 'Transaction-Delete-Request';
    this.reportMyTxn = 'report-my-txn';
    this.requestAdmin='RequestAdmin'
  }
}

export const string = new stringConst();

class status {
  Pending = 'pending';
  Tally = 'awaiting_tally_approval';
  Carrier = 'awaiting_carrier_approval';
  Admin = 'awaiting_admin_final_approval';
  Approved = 'approved';
  Rejected = 'rejected';
  Paid = 'paid';
}

export const approval = new status();
