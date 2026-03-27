import Head from 'next/head';
import PaymentForm from '../components/PaymentForm';

export default function PayFees() {
  return (
    <>
      <Head>
        <title>Pay Fees | StellarEduPay</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <PaymentForm />
    </>
  );
}
