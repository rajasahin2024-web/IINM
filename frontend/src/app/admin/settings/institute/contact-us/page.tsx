import { AdminProvider } from "../../../components/ProtectedAdmin";
import { ContactUsSettingsInner } from "./ContactUsSettingsInner";

export default function ContactUsSettingsPage() {
  return (
    <AdminProvider>
      <ContactUsSettingsInner />
    </AdminProvider>
  );
}
