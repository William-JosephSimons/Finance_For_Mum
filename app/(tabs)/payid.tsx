import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useState } from "react";
import { useAppStore, PayIDContact } from "@/lib/store";
import * as Clipboard from "expo-clipboard";

export default function PayIDScreen() {
  const { contacts, addContact, removeContact } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPayId, setNewPayId] = useState("");
  const [newType, setNewType] = useState<PayIDContact["type"]>("Phone");
  const [deletingContactId, setDeletingContactId] = useState<string | null>(
    null,
  );

  const handleCopy = async (payId: string, name: string) => {
    await Clipboard.setStringAsync(payId);
    Alert.alert("Copied!", `${name}'s PayID copied to clipboard`);
  };

  const handleAdd = () => {
    if (!newName.trim() || !newPayId.trim()) {
      Alert.alert("Missing Info", "Please enter both name and PayID");
      return;
    }

    addContact({
      id: Date.now().toString(),
      name: newName.trim(),
      payId: newPayId.trim(),
      type: newType,
    });

    setNewName("");
    setNewPayId("");
    setNewType("Phone");
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setDeletingContactId(id);
  };

  const confirmDelete = (id: string) => {
    removeContact(id);
    setDeletingContactId(null);
  };

  return (
    <ScrollView className="flex-1 bg-surface dark:bg-surface-dark">
      {/* Header */}
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-display text-accent dark:text-accent-dark">
          PayID Book
        </Text>
        <Text className="text-muted dark:text-muted-dark mt-1 font-medium">
          Store family PayID details for quick copying
        </Text>
      </View>

      {/* Add Button */}
      <View className="px-6 py-2">
        <Pressable
          onPress={() => setIsAdding(!isAdding)}
          className="bg-accent dark:bg-accent-dark py-5 rounded-[24px] items-center active:scale-95 transition-transform border border-accent dark:border-border-dark"
        >
          <Text className="text-accent-dark dark:text-accent text-lg font-bold">
            {isAdding ? "Cancel" : "+ Add PayID Contact"}
          </Text>
        </Pressable>
      </View>

      {/* Add Form */}
      {isAdding && (
        <View className="px-6 py-4">
          <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl border border-border dark:border-border-dark p-6 shadow-lg">
            <Text className="text-accent dark:text-accent-dark font-bold text-xl mb-6">
              New Contact
            </Text>

            <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-2">
              Name
            </Text>
            <TextInput
              className="bg-surface-subtle dark:bg-accent-dark/20 rounded-2xl px-5 py-4 text-lg text-accent dark:text-accent-dark mb-6"
              placeholder="e.g. Sarah"
              placeholderTextColor="#A1A1AA"
              value={newName}
              onChangeText={setNewName}
            />

            <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-2">
              Type
            </Text>
            <View className="flex-row gap-2 mb-6">
              {(["Phone", "Email", "ABN"] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setNewType(type)}
                  className={`flex-1 py-4 rounded-2xl items-center border ${
                    newType === type ?
                      "bg-accent dark:bg-accent-dark border-accent dark:border-white"
                    : "bg-surface-subtle dark:bg-accent-dark/20 border-transparent"
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      newType === type ?
                        "text-accent-dark dark:text-accent"
                      : "text-muted dark:text-muted-dark"
                    }`}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-2">
              {newType === "Phone" ?
                "Phone Number"
              : newType === "Email" ?
                "Email Address"
              : "ABN"}
            </Text>
            <TextInput
              className="bg-surface-subtle dark:bg-accent-dark/20 rounded-2xl px-5 py-4 text-lg text-accent dark:text-accent-dark mb-8"
              placeholder={
                newType === "Phone" ? "0412 345 678"
                : newType === "Email" ?
                  "name@example.com"
                : "12 345 678 901"
              }
              placeholderTextColor="#A1A1AA"
              value={newPayId}
              onChangeText={setNewPayId}
              keyboardType={newType === "Phone" ? "phone-pad" : "default"}
              autoCapitalize="none"
            />

            <Pressable
              onPress={handleAdd}
              className="bg-positive py-5 rounded-[20px] items-center active:scale-95 transition-transform"
            >
              <Text className="text-white text-lg font-bold">Save Contact</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Contact Cards */}
      <View className="px-6 py-4 gap-4">
        {contacts.length === 0 && !isAdding && (
          <View className="bg-accent-muted rounded-2xl p-8 items-center">
            <Text className="text-accent text-lg font-semibold mb-2">
              No PayID Contacts
            </Text>
            <Text className="text-accent/70 text-center">
              Add family members' PayID details for quick access
            </Text>
          </View>
        )}

        {contacts.map((contact) => (
          <View
            key={contact.id}
            className="bg-white dark:bg-surface-subtle-dark rounded-3xl border border-border dark:border-border-dark p-6 shadow-sm"
          >
            {deletingContactId === contact.id ?
              <View>
                <Text className="text-negative font-bold text-lg mb-2">
                  Delete {contact.name}?
                </Text>
                <Text className="text-muted dark:text-muted-dark mb-6">
                  Are you sure you want to remove this contact?
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setDeletingContactId(null)}
                    className="flex-1 py-4 rounded-2xl items-center bg-surface-subtle dark:bg-accent-dark/20 border border-border dark:border-border-dark"
                  >
                    <Text className="text-accent dark:text-accent-dark font-bold">
                      Keep
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(contact.id)}
                    className="flex-1 py-4 rounded-2xl items-center bg-negative active:scale-95"
                  >
                    <Text className="text-white font-bold">Delete</Text>
                  </Pressable>
                </View>
              </View>
            : <>
                <View className="flex-row justify-between items-start mb-6">
                  <View>
                    <Text className="text-accent dark:text-accent-dark font-bold text-xl">
                      {contact.name}
                    </Text>
                    <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mt-1">
                      {contact.type}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(contact.id)}
                    className="w-10 h-10 bg-surface-subtle dark:bg-accent-dark/20 rounded-full items-center justify-center active:scale-95"
                  >
                    <Text className="text-negative text-lg font-bold">✕</Text>
                  </Pressable>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="flex-1 bg-surface-subtle dark:bg-accent-dark/20 border border-border dark:border-border-dark rounded-2xl px-5 py-4">
                    <Text className="text-accent dark:text-accent-dark text-lg font-mono font-bold">
                      {contact.payId}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleCopy(contact.payId, contact.name)}
                    className="bg-accent-blue/10 px-6 py-4 rounded-2xl active:scale-95 transition-transform"
                  >
                    <Text className="text-accent-blue font-bold text-base">
                      COPY
                    </Text>
                  </Pressable>
                </View>
              </>
            }
          </View>
        ))}
      </View>

      {/* Bottom padding */}
      <View className="h-24" />
    </ScrollView>
  );
}
