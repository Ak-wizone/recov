import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanyProfileSchema, type InsertCompanyProfile, type CompanyProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Loader2, Upload, Building2, MapPin, Users, CreditCard, Palette,
  FileText, Phone, Mail, User, Briefcase, Calendar, Building, Landmark,
  CheckCircle2, Settings2
} from "lucide-react";
import { SalesPersonManagement } from "@/components/sales-person-management";

export default function CompanySettings() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState("company");

  const { data: profile, isLoading } = useQuery<CompanyProfile | null>({
    queryKey: ["/api/company-profile"],
  });

  const form = useForm<InsertCompanyProfile>({
    resolver: zodResolver(insertCompanyProfileSchema),
    defaultValues: {
      logo: profile?.logo || "",
      legalName: profile?.legalName || "",
      entityType: profile?.entityType || "",
      gstin: profile?.gstin || "",
      pan: profile?.pan || "",
      cin: profile?.cin || "",
      yearOfIncorporation: profile?.yearOfIncorporation || "",
      regAddressLine1: profile?.regAddressLine1 || "",
      regAddressLine2: profile?.regAddressLine2 || "",
      regCity: profile?.regCity || "",
      regState: profile?.regState || "",
      regPincode: profile?.regPincode || "",
      corpAddressLine1: profile?.corpAddressLine1 || "",
      corpAddressLine2: profile?.corpAddressLine2 || "",
      corpCity: profile?.corpCity || "",
      corpState: profile?.corpState || "",
      corpPincode: profile?.corpPincode || "",
      primaryContactName: profile?.primaryContactName || "",
      primaryContactDesignation: profile?.primaryContactDesignation || "",
      primaryContactMobile: profile?.primaryContactMobile || "",
      primaryContactEmail: profile?.primaryContactEmail || "",
      accountsContactName: profile?.accountsContactName || "",
      accountsContactMobile: profile?.accountsContactMobile || "",
      accountsContactEmail: profile?.accountsContactEmail || "",
      bankName: profile?.bankName || "",
      branchName: profile?.branchName || "",
      accountName: profile?.accountName || "",
      accountNumber: profile?.accountNumber || "",
      ifscCode: profile?.ifscCode || "",
      brandColor: profile?.brandColor || "#ea580c",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        logo: profile.logo || "",
        legalName: profile.legalName || "",
        entityType: profile.entityType || "",
        gstin: profile.gstin || "",
        pan: profile.pan || "",
        cin: profile.cin || "",
        yearOfIncorporation: profile.yearOfIncorporation || "",
        regAddressLine1: profile.regAddressLine1 || "",
        regAddressLine2: profile.regAddressLine2 || "",
        regCity: profile.regCity || "",
        regState: profile.regState || "",
        regPincode: profile.regPincode || "",
        corpAddressLine1: profile.corpAddressLine1 || "",
        corpAddressLine2: profile.corpAddressLine2 || "",
        corpCity: profile.corpCity || "",
        corpState: profile.corpState || "",
        corpPincode: profile.corpPincode || "",
        primaryContactName: profile.primaryContactName || "",
        primaryContactDesignation: profile.primaryContactDesignation || "",
        primaryContactMobile: profile.primaryContactMobile || "",
        primaryContactEmail: profile.primaryContactEmail || "",
        accountsContactName: profile.accountsContactName || "",
        accountsContactMobile: profile.accountsContactMobile || "",
        accountsContactEmail: profile.accountsContactEmail || "",
        bankName: profile.bankName || "",
        branchName: profile.branchName || "",
        accountName: profile.accountName || "",
        accountNumber: profile.accountNumber || "",
        ifscCode: profile.ifscCode || "",
        brandColor: profile.brandColor || "#ea580c",
      });
      setLogoPreview(profile.logo || "");
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertCompanyProfile) => {
      const response = await fetch("/api/company-profile", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
      toast({
        title: "Success",
        description: "Company profile saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/company-profile/upload-logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();
      form.setValue("logo", data.logoUrl);
      setLogoPreview(data.logoUrl);
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = (data: InsertCompanyProfile) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const entityTypes = [
    "Private Limited Company",
    "Public Limited Company",
    "Limited Liability Partnership (LLP)",
    "Partnership Firm",
    "Sole Proprietorship",
    "One Person Company (OPC)",
    "Other",
  ];

  const completionStatus = () => {
    const fields = [
      profile?.legalName,
      profile?.entityType,
      profile?.gstin,
      profile?.pan,
      profile?.regAddressLine1,
      profile?.regCity,
      profile?.regState,
      profile?.regPincode,
      profile?.primaryContactName,
      profile?.primaryContactMobile,
      profile?.primaryContactEmail,
      profile?.bankName,
      profile?.accountNumber,
      profile?.ifscCode,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const progress = completionStatus();

  return (
    <div className="-m-6 lg:-m-8 -mb-6 lg:-mb-8 flex flex-col min-h-0 max-h-[calc(100vh-0px)] h-[calc(100vh-0px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header Section with Progress */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Settings2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Company Settings</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your organization profile and team</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${progress === 100 ? 'text-green-600' : progress >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                {progress}%
              </span>
              <p className="text-xs text-slate-500">Profile Complete</p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400">{Math.round(progress / 100 * 14)} of 14 fields completed</span>
              <span className="text-xs text-slate-400">{100 - progress}% remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <TabsTrigger value="company" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              <TabsTrigger value="finance" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Finance</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
            </TabsList>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              <SalesPersonManagement />
            </TabsContent>

            {/* Company Tab */}
            <TabsContent value="company" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Logo & Basic Info */}
                  <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Company Identity</CardTitle>
                          <CardDescription>Logo and legal information</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Logo Upload */}
                      <div className="flex items-start gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="relative">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Company Logo" className="h-28 w-28 object-contain border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900" data-testid="img-logo-preview" />
                          ) : (
                            <div className="h-28 w-28 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900">
                              <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-white mb-1">Company Logo</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Upload your company logo. Recommended: 200x200px</p>
                          <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" data-testid="input-logo" />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => document.getElementById('logo')?.click()} className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400" data-testid="button-upload-logo">
                            {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            {logoPreview ? "Change Logo" : "Upload Logo"}
                          </Button>
                          <p className="text-xs text-slate-400 mt-2">PNG, JPG, SVG up to 5MB</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="legalName" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="flex items-center gap-2"><Building className="h-4 w-4 text-slate-400" />Legal Name</FormLabel>
                            <FormControl><Input {...field} placeholder="Enter legal company name" className="h-11" data-testid="input-legal-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="entityType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-400" />Entity Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="h-11" data-testid="select-entity-type"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                              <SelectContent>{entityTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="yearOfIncorporation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" />Year of Incorporation</FormLabel>
                            <FormControl><Input {...field} placeholder="Date of Registration" className="h-11" data-testid="input-year" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" />Tax & Registration</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="gstin" render={({ field }) => (
                            <FormItem><FormLabel>GSTIN</FormLabel><FormControl><Input {...field} placeholder="22AAAAA0000A1Z5" className="h-11 font-mono" data-testid="input-gstin" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="pan" render={({ field }) => (
                            <FormItem><FormLabel>PAN Number</FormLabel><FormControl><Input {...field} placeholder="AAAAA0000A" className="h-11 font-mono uppercase" data-testid="input-pan" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="cin" render={({ field }) => (
                            <FormItem><FormLabel>CIN / Reg. Number</FormLabel><FormControl><Input {...field} placeholder="Corporate ID" className="h-11 font-mono" data-testid="input-cin" /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Addresses */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg"><MapPin className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
                          <div><CardTitle className="text-lg">Registered Address</CardTitle><CardDescription>Legal registered office</CardDescription></div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField control={form.control} name="regAddressLine1" render={({ field }) => (<FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} placeholder="Street address" className="h-11" data-testid="input-reg-address1" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="regAddressLine2" render={({ field }) => (<FormItem><FormLabel>Address Line 2</FormLabel><FormControl><Input {...field} placeholder="Apartment, suite, etc." className="h-11" data-testid="input-reg-address2" /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="regCity" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} placeholder="City" className="h-11" data-testid="input-reg-city" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="regState" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} placeholder="State" className="h-11" data-testid="input-reg-state" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="regPincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} placeholder="000000" className="h-11" data-testid="input-reg-pincode" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg"><Building className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
                          <div><CardTitle className="text-lg">Corporate Address</CardTitle><CardDescription>Operational office (if different)</CardDescription></div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField control={form.control} name="corpAddressLine1" render={({ field }) => (<FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} placeholder="Street address" className="h-11" data-testid="input-corp-address1" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="corpAddressLine2" render={({ field }) => (<FormItem><FormLabel>Address Line 2</FormLabel><FormControl><Input {...field} placeholder="Apartment, suite, etc." className="h-11" data-testid="input-corp-address2" /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="corpCity" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} placeholder="City" className="h-11" data-testid="input-corp-city" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="corpState" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} placeholder="State" className="h-11" data-testid="input-corp-state" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="corpPincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} placeholder="000000" className="h-11" data-testid="input-corp-pincode" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700 px-8" data-testid="button-save-company">
                      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Company Details
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><User className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
                          <div><CardTitle className="text-lg">Primary Contact</CardTitle><CardDescription>Main point of contact</CardDescription></div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="primaryContactName" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" />Name</FormLabel><FormControl><Input {...field} placeholder="Contact name" className="h-11" data-testid="input-primary-name" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="primaryContactDesignation" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-slate-400" />Designation</FormLabel><FormControl><Input {...field} placeholder="e.g., Director" className="h-11" data-testid="input-primary-designation" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="primaryContactMobile" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" />Mobile</FormLabel><FormControl><Input {...field} placeholder="+91 9876543210" className="h-11" data-testid="input-primary-mobile" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="primaryContactEmail" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" />Email</FormLabel><FormControl><Input {...field} type="email" placeholder="email@company.com" className="h-11" data-testid="input-primary-email" /></FormControl><FormMessage /></FormItem>)} />
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg"><CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
                          <div><CardTitle className="text-lg">Accounts Contact</CardTitle><CardDescription>Finance department contact</CardDescription></div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField control={form.control} name="accountsContactName" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" />Name</FormLabel><FormControl><Input {...field} placeholder="Accounts person name" className="h-11" data-testid="input-accounts-name" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="accountsContactMobile" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" />Mobile</FormLabel><FormControl><Input {...field} placeholder="+91 9876543210" className="h-11" data-testid="input-accounts-mobile" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="accountsContactEmail" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" />Email</FormLabel><FormControl><Input {...field} type="email" placeholder="accounts@company.com" className="h-11" data-testid="input-accounts-email" /></FormControl><FormMessage /></FormItem>)} />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700 px-8" data-testid="button-save-contacts">
                      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Contact Details
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Finance Tab */}
            <TabsContent value="finance" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg"><Landmark className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
                          <div><CardTitle className="text-lg">Bank Account</CardTitle><CardDescription>Primary bank account details</CardDescription></div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} placeholder="e.g., HDFC Bank" className="h-11" data-testid="input-bank-name" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="branchName" render={({ field }) => (<FormItem><FormLabel>Branch Name</FormLabel><FormControl><Input {...field} placeholder="Branch name" className="h-11" data-testid="input-branch-name" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="accountName" render={({ field }) => (<FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input {...field} placeholder="Account holder name" className="h-11" data-testid="input-account-name" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} placeholder="Account number" className="h-11 font-mono" data-testid="input-account-number" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="ifscCode" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} placeholder="e.g., HDFC0001234" className="h-11 font-mono uppercase" data-testid="input-ifsc" /></FormControl><FormMessage /></FormItem>)} />
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg"><Palette className="h-5 w-5 text-pink-600 dark:text-pink-400" /></div>
                          <div><CardTitle className="text-lg">Branding</CardTitle><CardDescription>Customize appearance</CardDescription></div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField control={form.control} name="brandColor" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand Color</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Input type="color" {...field} className="w-16 h-16 cursor-pointer rounded-xl border-2 border-slate-200 dark:border-slate-600 p-1" data-testid="input-brand-color" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selected Color</p>
                                  <Input {...field} placeholder="#ea580c" className="h-11 font-mono uppercase" data-testid="input-brand-color-hex" />
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Preview</h4>
                          <div className="flex gap-3">
                            <div className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: form.watch("brandColor") || "#ea580c" }}>Primary Button</div>
                            <div className="px-4 py-2 rounded-lg text-sm font-medium border-2" style={{ borderColor: form.watch("brandColor") || "#ea580c", color: form.watch("brandColor") || "#ea580c" }}>Secondary Button</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end pt-4 pb-6">
                    <Button type="submit" size="lg" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700 px-8" data-testid="button-save-finance">
                      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Finance Details
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
