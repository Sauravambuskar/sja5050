import { forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignaturePad = forwardRef<SignatureCanvas>((props, ref) => {
  return (
    <SignatureCanvas
      ref={ref}
      penColor='black'
      canvasProps={{ className: 'w-full h-40 bg-white border rounded-md' }}
      {...props}
    />
  );
});

export default SignaturePad;