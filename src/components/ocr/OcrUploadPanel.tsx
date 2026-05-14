import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ScanLine, Upload, FileText, User, Users, CheckCircle2,
  RotateCcw, Loader2, Eye, EyeOff, Wand2,
} from 'lucide-react';
import {
  runOcrOnFile, extractFields, toUpperName, parseDate,
  DOCUMENT_TYPE_LABELS,
  type ExtractedMainUserData,
  type ExtractedNomineeData,
  type OcrExtractionResult,
  type OcrTarget,
} from '@/lib/ocr';
import { cn } from '@/lib/utils';

interface OcrUploadPanelProps {
  onFillMainUser: (data: ExtractedMainUserData) => void;
  onFillNominee: (data: ExtractedNomineeData) => void;
  trigger?: React.ReactNode;
  className?: string;
}

type Step = 'upload' | 'processing' | 'who_for' | 'review' | 'done';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;

const FieldRow = ({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input
      className="h-7 text-xs"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

export const OcrUploadPanel = ({ onFillMainUser, onFillNominee, trigger, className }: OcrUploadPanelProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [target, setTarget] = useState<OcrTarget>('main_user');
  const [preprocess, setPreprocess] = useState(true);

  const [editMain, setEditMain] = useState<ExtractedMainUserData>({});
  const [editNominee, setEditNominee] = useState<ExtractedNomineeData>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setRawText('');
    setShowRaw(false);
    setOcrResult(null);
    setTarget('main_user');
    setEditMain({});
    setEditNominee({});
  };

  const handleOpen = () => { reset(); setOpen(true); };
  const handleClose = () => { setOpen(false); reset(); };

  const processFile = useCallback(async (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error('Only JPG, PNG, WebP, or PDF files are accepted.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    if (f.type !== 'application/pdf') {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
    setStep('processing');
    setProgress(0);
    try {
      const text = await runOcrOnFile(f, p => setProgress(p), preprocess);
      setRawText(text);
      const result = extractFields(text);
      setOcrResult(result);
      setEditMain({ ...result.main_user });
      setEditNominee({ ...result.nominee });
      setStep('who_for');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OCR failed.';
      toast.error(`OCR Error: ${msg}`);
      setStep('upload');
    }
  }, [preprocess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleApply = () => {
    if (target === 'main_user') {
      const data: ExtractedMainUserData = {};
      if (editMain.full_name) data.full_name = toUpperName(editMain.full_name);
      if (editMain.dob) data.dob = editMain.dob;
      if (editMain.phone) data.phone = editMain.phone;
      if (editMain.address) data.address = editMain.address.toUpperCase();
      if (editMain.city) data.city = editMain.city.toUpperCase();
      if (editMain.state) data.state = editMain.state.toUpperCase();
      if (editMain.pincode) data.pincode = editMain.pincode;
      if (editMain.blood_group) data.blood_group = editMain.blood_group;
      if (editMain.pan_number) data.pan_number = editMain.pan_number.toUpperCase();
      if (editMain.aadhaar_number) data.aadhaar_number = editMain.aadhaar_number;
      if (editMain.bank_name) data.bank_name = editMain.bank_name.toUpperCase();
      if (editMain.bank_account_holder_name) data.bank_account_holder_name = toUpperName(editMain.bank_account_holder_name);
      if (editMain.bank_account_number) data.bank_account_number = editMain.bank_account_number;
      if (editMain.bank_ifsc_code) data.bank_ifsc_code = editMain.bank_ifsc_code.toUpperCase();
      onFillMainUser(data);
      toast.success('OCR data applied to your profile fields.');
    } else {
      const data: ExtractedNomineeData = {};
      if (editNominee.full_name) data.full_name = toUpperName(editNominee.full_name);
      if (editNominee.dob) data.dob = editNominee.dob;
      if (editNominee.blood_group) data.blood_group = editNominee.blood_group;
      onFillNominee(data);
      toast.success('OCR data applied to nominee fields. Open Add Nominee to review.');
    }
    setStep('done');
  };

  const setField = (key: keyof ExtractedMainUserData, val: string) =>
    setEditMain(prev => ({ ...prev, [key]: val }));
  const setNomField = (key: keyof ExtractedNomineeData, val: string) =>
    setEditNominee(prev => ({ ...prev, [key]: val }));

  const docLabel = ocrResult ? DOCUMENT_TYPE_LABELS[ocrResult.document_type] : '';

  const hasMainFields = Object.values(editMain).some(v => v && String(v).trim());
  const hasNomFields = Object.values(editNominee).some(v => v && String(v).trim());

  return (
    <>
      <div className={className} onClick={handleOpen}>
        {trigger ?? (
          <Button variant="outline" size="sm" type="button" className="gap-2">
            <ScanLine className="h-4 w-4" />
            OCR Auto-Fill
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Document OCR Auto-Fill
            </DialogTitle>
          </DialogHeader>

          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preprocess}
                    onChange={e => setPreprocess(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-muted-foreground">Enhance contrast before OCR (recommended)</span>
                </label>
              </div>

              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
                  isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
                )}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Drop document here or click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aadhaar · PAN · Passport · Driving License · Voter ID · Bank Passbook
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, PDF · Max {MAX_SIZE_MB}MB</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileInput}
                />
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-5">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">Reading your document…</p>
                  <p className="text-sm text-muted-foreground">
                    {file?.name} · OCR in progress
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recognition</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            </div>
          )}

          {step === 'who_for' && ocrResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{docLabel}</Badge>
                <span className="text-sm text-muted-foreground">detected</span>
              </div>

              <div>
                <p className="font-semibold text-base mb-3">This document belongs to:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setTarget('main_user'); setStep('review'); }}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all hover:border-primary hover:bg-primary/5',
                      target === 'main_user' ? 'border-primary bg-primary/5' : 'border-muted',
                    )}
                  >
                    <div className="rounded-full bg-blue-100 p-3">
                      <User className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Main User</p>
                      <p className="text-xs text-muted-foreground mt-1">Personal, Bank & KYC details</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTarget('nominee'); setStep('review'); }}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all hover:border-primary hover:bg-primary/5',
                      target === 'nominee' ? 'border-primary bg-primary/5' : 'border-muted',
                    )}
                  >
                    <div className="rounded-full bg-green-100 p-3">
                      <Users className="h-7 w-7 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Nominee</p>
                      <p className="text-xs text-muted-foreground mt-1">Nominee name & details</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Upload Another
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRaw(v => !v)}
                  className="gap-2 ml-auto"
                >
                  {showRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showRaw ? 'Hide' : 'View'} Raw Text
                </Button>
              </div>

              {showRaw && (
                <Textarea
                  readOnly
                  className="font-mono text-xs h-40 resize-none"
                  value={rawText}
                />
              )}
            </div>
          )}

          {step === 'review' && ocrResult && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{docLabel}</Badge>
                  <span className="text-sm text-muted-foreground">→</span>
                  <Badge variant={target === 'main_user' ? 'default' : 'outline'}>
                    {target === 'main_user' ? 'Main User' : 'Nominee'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('who_for')}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3" /> Change
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Review and edit extracted fields before applying. Empty fields will be skipped.
              </p>

              {target === 'main_user' ? (
                <div className="space-y-3">
                  {hasMainFields ? (
                    <>
                      {editMain.full_name !== undefined && (
                        <FieldRow label="Full Name" value={editMain.full_name || ''} onChange={v => setField('full_name', v)} />
                      )}
                      {editMain.dob !== undefined && (
                        <FieldRow label="Date of Birth" value={editMain.dob || ''} onChange={v => setField('dob', v)} />
                      )}
                      {editMain.phone !== undefined && (
                        <FieldRow label="Phone" value={editMain.phone || ''} onChange={v => setField('phone', v)} />
                      )}
                      {editMain.blood_group !== undefined && (
                        <FieldRow label="Blood Group" value={editMain.blood_group || ''} onChange={v => setField('blood_group', v)} />
                      )}
                      {editMain.address !== undefined && (
                        <FieldRow label="Address" value={editMain.address || ''} onChange={v => setField('address', v)} />
                      )}
                      {editMain.city !== undefined && (
                        <FieldRow label="City" value={editMain.city || ''} onChange={v => setField('city', v)} />
                      )}
                      {editMain.state !== undefined && (
                        <FieldRow label="State" value={editMain.state || ''} onChange={v => setField('state', v)} />
                      )}
                      {editMain.pincode !== undefined && (
                        <FieldRow label="Pincode" value={editMain.pincode || ''} onChange={v => setField('pincode', v)} />
                      )}
                      {editMain.pan_number !== undefined && (
                        <FieldRow label="PAN Number" value={editMain.pan_number || ''} onChange={v => setField('pan_number', v)} />
                      )}
                      {editMain.aadhaar_number !== undefined && (
                        <FieldRow label="Aadhaar Number" value={editMain.aadhaar_number || ''} onChange={v => setField('aadhaar_number', v)} />
                      )}
                      {editMain.bank_name !== undefined && (
                        <FieldRow label="Bank Name" value={editMain.bank_name || ''} onChange={v => setField('bank_name', v)} />
                      )}
                      {editMain.bank_account_holder_name !== undefined && (
                        <FieldRow label="Account Holder" value={editMain.bank_account_holder_name || ''} onChange={v => setField('bank_account_holder_name', v)} />
                      )}
                      {editMain.bank_account_number !== undefined && (
                        <FieldRow label="Account Number" value={editMain.bank_account_number || ''} onChange={v => setField('bank_account_number', v)} />
                      )}
                      {editMain.bank_ifsc_code !== undefined && (
                        <FieldRow label="IFSC Code" value={editMain.bank_ifsc_code || ''} onChange={v => setField('bank_ifsc_code', v)} />
                      )}
                    </>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4 border rounded-lg bg-muted/30">
                      No fields could be extracted from this document.<br />
                      <span className="text-xs">Try a clearer scan or adjust the image.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {hasNomFields ? (
                    <>
                      {editNominee.full_name !== undefined && (
                        <FieldRow label="Full Name" value={editNominee.full_name || ''} onChange={v => setNomField('full_name', v)} />
                      )}
                      {editNominee.dob !== undefined && (
                        <FieldRow label="Date of Birth" value={editNominee.dob || ''} onChange={v => setNomField('dob', v)} />
                      )}
                      {editNominee.blood_group !== undefined && (
                        <FieldRow label="Blood Group" value={editNominee.blood_group || ''} onChange={v => setNomField('blood_group', v)} />
                      )}
                    </>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4 border rounded-lg bg-muted/30">
                      No nominee fields could be extracted.<br />
                      <span className="text-xs">Try a clearer scan or adjust the image.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRaw(v => !v)}
                  className="gap-2"
                >
                  {showRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showRaw ? 'Hide' : 'View'} Raw OCR Text
                </Button>
                {previewUrl && (
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="ml-auto">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <FileText className="h-3.5 w-3.5" /> Preview Image
                    </Button>
                  </a>
                )}
              </div>

              {showRaw && (
                <Textarea readOnly className="font-mono text-xs h-36 resize-none" value={rawText} />
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setStep('who_for')}>Back</Button>
                <Button
                  onClick={handleApply}
                  disabled={target === 'main_user' ? !hasMainFields : !hasNomFields}
                  className="gap-2 ml-auto"
                >
                  <Wand2 className="h-4 w-4" />
                  Apply to {target === 'main_user' ? 'Profile' : 'Nominee'} Fields
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-green-100 p-5">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Fields Applied Successfully!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {target === 'main_user'
                    ? 'Scroll down to review and save the auto-filled fields.'
                    : 'Click "Add Nominee" to see the pre-filled nominee form.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Scan Another Document</Button>
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

