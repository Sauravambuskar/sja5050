import { Badge } from "@/components/ui/badge";

type AuditLogDetailsProps = {
  action: string;
  details: any;
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="font-semibold">{label}:</span>
    <span className="text-muted-foreground">{value}</span>
  </div>
);

export const AuditLogDetails = ({ action, details }: AuditLogDetailsProps) => {
  if (!details) return <span className="text-muted-foreground">No details</span>;

  switch (action) {
    case 'adjusted_wallet':
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <DetailItem label="Amount" value={`₹${details.amount?.toLocaleString('en-IN')}`} />
          <DetailItem label="Reason" value={details.description} />
        </div>
      );
    case 'processed_withdrawal':
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <DetailItem label="Amount" value={`₹${details.amount?.toLocaleString('en-IN')}`} />
          <DetailItem label="New Status" value={<Badge variant={details.new_status === 'Completed' ? 'default' : 'destructive'}>{details.new_status}</Badge>} />
          <DetailItem label="Notes" value={details.notes} />
        </div>
      );
    case 'processed_kyc_request':
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <DetailItem label="New Status" value={<Badge variant={details.new_status === 'Approved' ? 'default' : 'destructive'}>{details.new_status}</Badge>} />
          <DetailItem label="Notes" value={details.notes} />
        </div>
      );
    case 'sent_broadcast_notification':
      return (
        <div className="flex flex-col items-start">
          <DetailItem label="Title" value={details.title} />
          <DetailItem label="Recipients" value={details.recipients} />
        </div>
      );
    case 'suspended_user':
    case 'unsuspended_user':
      return <DetailItem label="Reason" value={details.reason} />;
    case 'updated_user_role_and_name':
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <DetailItem label="New Name" value={details.fullName} />
          <DetailItem label="New Role" value={<Badge variant="outline">{details.role}</Badge>} />
        </div>
      );
    case 'created_user':
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <DetailItem label="Email" value={details.email} />
          <DetailItem label="Name" value={details.full_name} />
        </div>
      );
    case 'triggered_maturity_processing':
      return <DetailItem label="Result" value={details.result} />;
    case 'updated_user_profile':
        return <DetailItem label="Updated By" value={details.updated_by} />;
    default:
      return <span className="font-mono text-xs">{JSON.stringify(details)}</span>;
  }
};