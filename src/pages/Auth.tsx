import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LangSwitch } from '@/components/ui/langSwitch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sign } from 'crypto';

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, { message: "Full name must be at least 2 characters" }).max(100, { message: "Full name must be less than 100 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    email: '', 
    organization_name: '',
    usertype: 'individual' as 'individual' | 'organization',
    organization_id: '',
    password: '', 
    confirmPassword: '',
    name: '' 
  });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const result = await signIn(loginData.email, loginData.password);

    if (result?.error) {
      throw result.error;
    }

    toast({
      title: "Success",
      description: "Logged in successfully!",
    });

    navigate("/");
  } catch (err: any) {
    toast({
      title: "Login Failed",
      description: err.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

 const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const result = await signUp({
      ...signupData,
      user_type: signupData.usertype,
    });

    if (result?.error) {
      throw result.error;
    }

    toast({
      title: "Success",
      description: "Account created successfully!",
    });


    navigate('/');
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};


  return (
 <div className="min-h-screen flex flex-col justify-center bg-background">
  
  <div className="flex justify-center mb-4">
    <LangSwitch />
  </div>
    <div className="flex items-center justify-center bg-background p-4">
   
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Accounting System</CardTitle>
          <CardDescription>{t('auth.title')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('auth.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('auth.password')}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    t('auth.login')
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
               <div className="space-y-2">
                <label htmlFor="signup-organization">{t('auth.organization')}</label>
                <Select
                  value={signupData.usertype}
                  onValueChange={(value: 'individual' | 'organization') =>
                    setSignupData({ ...signupData, usertype: value })
                  }
                >
                  <SelectTrigger id="signup-organization" className="w-full">
                    <SelectValue placeholder={t('auth.selectOrganization')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">аж ахуй</SelectItem>
                    <SelectItem value="organization">байгууллага</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{signupData.usertype === 'individual' ? t('auth.fullName') : t('auth.organizationName')}</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupData.name}
                 onChange={(e) =>
                      signupData.usertype === 'individual'
                        ? setSignupData({ ...signupData, name: e.target.value })
                        : setSignupData({ ...signupData, organization_name: e.target.value })
                    }
                  />
                </div>
                {signupData.usertype === 'organization' && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-organization-id">{t('auth.organizationId')}</Label>
                    <Input
                      id="signup-organization-id"
                      type="text"
                      placeholder="Company id"
                      value={signupData.organization_id}
                      onChange={(e) => setSignupData({ ...signupData, organization_id: e.target.value })}
                      required
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    t('auth.signup')
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </div>
  
  );
};

export default Auth;
