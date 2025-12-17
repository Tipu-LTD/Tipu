import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Private Tutoring",
    description: "One-on-one sessions with expert university tutors",
    price: "£29-39",
    period: "/hour",
    features: [
      "55-minute live sessions",
      "Session recordings included",
      "Progress reports after each lesson",
      "GCSE & A-Level subjects",
      "Flexible scheduling",
      "Cancel anytime",
    ],
    discount: "10% off 10+ lessons",
    cta: "Book a Tutor",
    href: "/tutors",
    popular: true,
  },
  {
    name: "Parent Support Program",
    description: "Resources and community for involved parents",
    price: "£30-100",
    period: "/month",
    features: [
      "Weekly educational newsletters",
      "Video content library",
      "Group support sessions",
      "Tailored revision plans",
      "ADHD & dyslexia resources",
      "Priority tutor matching",
    ],
    tiers: "Basic • Standard • Premium",
    cta: "Explore Plans",
    href: "/register?service=psp",
    popular: false,
  },
  {
    name: "Homeschooling Support",
    description: "Comprehensive curriculum and tracking tools",
    price: "Custom",
    period: "quote",
    features: [
      "Curriculum-aligned lesson plans",
      "Progress tracking dashboard",
      "Full resource library access",
      "Work upload & review",
      "PSP access included",
      "Dedicated support",
    ],
    cta: "Get a Quote",
    href: "/register?service=homeschool",
    popular: false,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Find Your Perfect Fit
          </h2>
          <p className="text-lg text-muted-foreground">
            Transparent pricing with no hidden fees. Choose the plan that works
            for your family.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? "border-primary shadow-lg scale-105 md:scale-110"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-sm font-medium py-1.5">
                  <Sparkles className="inline h-4 w-4 mr-1" />
                  Most Popular
                </div>
              )}

              <CardHeader className={plan.popular ? "pt-10" : ""}>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>

                  {plan.discount && (
                    <Badge className="ml-2 bg-primary/10 text-primary border-0">
                      {plan.discount}
                    </Badge>
                  )}

                  {plan.tiers && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.tiers}
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  onClick={() => navigate(plan.href)}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="text-center text-muted-foreground mt-10">
          All prices in GBP. PSP and homeschooling subscriptions can be
          cancelled anytime.
        </p>
      </div>
    </section>
  );
}
