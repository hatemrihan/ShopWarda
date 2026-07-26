import ReturnForm from '@/features/returns/components/return-form';

export const metadata = {
  title: 'Return Request | ShopWarda',
  description:
    'Submit a return request for your ShopWarda order. Our Customer Care team will assist you shortly.',
};

export default function ReturnsPage() {
  return <ReturnForm />;
}
