import { PricingTable } from '@clerk/clerk-react';

const TestPricing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      <div className="container mx-auto px-4 py-20">
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 font-heading text-white">
              Test Pricing
            </h1>
            <p className="text-lg text-text-secondary font-body">
              Testing Clerk's PricingTable component
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
            <PricingTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPricing;