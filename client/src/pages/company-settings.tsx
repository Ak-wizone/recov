import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanyProfileSchema, type InsertCompanyProfile, type CompanyProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, Building2 } from "lucide-react";
import { SalesPersonManagement } from "@/components/sales-person-management";

export default function CompanySettings() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  return (
    <div className="flex-1 space-y-8 p-6 overflow-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-6xl mx-auto">
        {/* Sales Person Management */}
        <div className="mb-8">
          <SalesPersonManagement />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800 my-8"></div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Company legal details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo">Company Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="h-24 w-24 object-contain border rounded-lg"
                      data-testid="img-logo-preview"
                    />
                  ) : (
                    <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                      data-testid="input-logo"
                    />
                    <Label htmlFor="logo" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingLogo}
                        onClick={() => document.getElementById('logo')?.click()}
                        data-testid="button-upload-logo"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Logo
                      </Button>
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">Max 5MB, PNG, JPG, or SVG</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Legal Name of Company *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter legal company name" data-testid="input-legal-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Entity *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-entity-type">
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entityTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 22AAAAA0000A1Z5" data-testid="input-gstin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., AAAAA0000A" data-testid="input-pan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CIN / Registration Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Corporate Identification Number" data-testid="input-cin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearOfIncorporation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Incorporation</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 2020" data-testid="input-year" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Registered Office Address */}
          <Card>
            <CardHeader>
              <CardTitle>Registered Office Address</CardTitle>
              <CardDescription>Legal registered address of the company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="regAddressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Street address" data-testid="input-reg-address1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="regAddressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Apartment, suite, etc. (optional)" data-testid="input-reg-address2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="regCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="City" data-testid="input-reg-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="State" data-testid="input-reg-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regPincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Pincode" data-testid="input-reg-pincode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Corporate Office Address */}
          <Card>
            <CardHeader>
              <CardTitle>Corporate Office Address (Optional)</CardTitle>
              <CardDescription>Operational address if different from registered office</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="corpAddressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Street address" data-testid="input-corp-address1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="corpAddressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Apartment, suite, etc. (optional)" data-testid="input-corp-address2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="corpCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="City" data-testid="input-corp-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="corpState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="State" data-testid="input-corp-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="corpPincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Pincode" data-testid="input-corp-pincode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Contact Person</CardTitle>
              <CardDescription>Main point of contact for the company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contact person name" data-testid="input-primary-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactDesignation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Director, CEO" data-testid="input-primary-designation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+91 9876543210" data-testid="input-primary-mobile" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@company.com" data-testid="input-primary-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Accounts Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Accounts Contact</CardTitle>
              <CardDescription>Financial and accounting department contact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="accountsContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Accounts person name" data-testid="input-accounts-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountsContactMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+91 9876543210" data-testid="input-accounts-mobile" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountsContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="accounts@company.com" data-testid="input-accounts-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Banking & Finance */}
          <Card>
            <CardHeader>
              <CardTitle>Banking & Finance</CardTitle>
              <CardDescription>Company bank account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bank name" data-testid="input-bank-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Branch name" data-testid="input-branch-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Account holder name" data-testid="input-account-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Account number" data-testid="input-account-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ifscCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., SBIN0001234" data-testid="input-ifsc" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your brand appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="brandColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="color" 
                          {...field} 
                          className="w-20 h-10 cursor-pointer" 
                          data-testid="input-brand-color"
                        />
                        <Input 
                          {...field} 
                          placeholder="#ea580c" 
                          className="flex-1"
                          data-testid="input-brand-color-hex"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 mt-8">
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              data-testid="button-save"
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Company Profile
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
}
