import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface CompanySettings {
  company_name: string;
  registration_number: string;
  tax_number: string;
  address: string;
  phone: string;
  email: string;
  vat_registered: boolean;
  vat_rate: number;
  income_tax_rate: number;
  ebarimt_enabled: boolean;
  ebarimt_test_mode: boolean;
  ebarimt_api_key: string;
}

const Settings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: "",
    registration_number: "",
    tax_number: "",
    address: "",
    phone: "",
    email: "",
    vat_registered: false,
    vat_rate: 10,
    income_tax_rate: 10,
    ebarimt_enabled: false,
    ebarimt_test_mode: true,
    ebarimt_api_key: "",
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!settings.company_name || !settings.registration_number) {
      toast({
        title: t("transaction.validationError"),
        description: "Компанийн нэр болон регистрийн дугаар заавал бөглөх шаардлагатай",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("company_settings")
          .update(settings)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert({ ...settings, user_id: user.id });

        if (error) throw error;
      }

      toast({
        title: t("common.success"),
        description: t("settings.saveSuccess"),
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: t("common.error"),
        description: t("settings.saveError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.companyInfo")}</CardTitle>
          <CardDescription>Компанийн үндсэн мэдээллийг оруулна уу</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">{t("settings.companyName")}</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="ХХК"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_number">{t("settings.registrationNumber")}</Label>
              <Input
                id="registration_number"
                value={settings.registration_number}
                onChange={(e) => setSettings({ ...settings, registration_number: e.target.value })}
                placeholder="1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_number">{t("settings.taxNumber")}</Label>
              <Input
                id="tax_number"
                value={settings.tax_number}
                onChange={(e) => setSettings({ ...settings, tax_number: e.target.value })}
                placeholder="1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("settings.phone")}</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+976 99123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="company@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t("settings.address")}</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Улаанбаатар хот"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.taxSettings")}</CardTitle>
          <CardDescription>Татварын тохиргоог хийнэ үү</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vat_registered">{t("settings.vatRegistered")}</Label>
              <p className="text-sm text-muted-foreground">
                НӨАТ төлөгч бол идэвхжүүлнэ үү
              </p>
            </div>
            <Switch
              id="vat_registered"
              checked={settings.vat_registered}
              onCheckedChange={(checked) => setSettings({ ...settings, vat_registered: checked })}
            />
          </div>

          {settings.vat_registered && (
            <div className="space-y-2">
              <Label htmlFor="vat_rate">{t("settings.vatRate")}</Label>
              <Input
                id="vat_rate"
                type="number"
                value={settings.vat_rate}
                onChange={(e) => setSettings({ ...settings, vat_rate: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="income_tax_rate">{t("settings.incomeTaxRate")}</Label>
            <Input
              id="income_tax_rate"
              type="number"
              value={settings.income_tax_rate}
              onChange={(e) => setSettings({ ...settings, income_tax_rate: parseFloat(e.target.value) || 0 })}
              min="0"
              max="100"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.ebarimtSettings")}</CardTitle>
          <CardDescription>E-Barimt системийн тохиргоо (Одоогоор туршилтын горим)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ebarimt_enabled">{t("settings.ebarimtEnabled")}</Label>
              <p className="text-sm text-muted-foreground">
                E-Barimt систем ашиглах эсэх
              </p>
            </div>
            <Switch
              id="ebarimt_enabled"
              checked={settings.ebarimt_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, ebarimt_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ebarimt_test_mode">{t("settings.ebarimtTestMode")}</Label>
              <p className="text-sm text-muted-foreground">
                Туршилтын горимд ажиллуулах
              </p>
            </div>
            <Switch
              id="ebarimt_test_mode"
              checked={settings.ebarimt_test_mode}
              onCheckedChange={(checked) => setSettings({ ...settings, ebarimt_test_mode: checked })}
            />
          </div>

          {settings.ebarimt_enabled && (
            <div className="space-y-2">
              <Label htmlFor="ebarimt_api_key">{t("settings.ebarimtApiKey")}</Label>
              <Input
                id="ebarimt_api_key"
                type="password"
                value={settings.ebarimt_api_key}
                onChange={(e) => setSettings({ ...settings, ebarimt_api_key: e.target.value })}
                placeholder="API түлхүүр"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
