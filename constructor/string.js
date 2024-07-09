class stringConst {
  Admin = 'superAdmin';
  User = 'user';
  Maker = 'maker';
  Checker = 'checker';
  Carrier = 'carrier';
  Credit = 'credit';
  Debit = 'debit';
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
