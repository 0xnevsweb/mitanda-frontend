import { useCallback, useState, ChangeEvent, useRef, useEffect } from 'react';
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import { useForm } from 'react-hook-form';
import { useAccount } from 'wagmi';
import { v4 as uuidv4 } from 'uuid';
import TandaManagerABI from '@/config/abis/TandaManagerABI.json';
import { TandaFormValues } from '@/types';
import { Image, Info, X } from 'lucide-react';
import { createTanda } from '@/utils/supabase/tandas';
import { supabase } from '@/lib/supabase';
import { useConversations } from '@/hooks/useConversations';
import { GroupPermissionsOptions } from '@xmtp/browser-sdk';
import toast from 'react-hot-toast';
import { useTandas } from '@/contexts/TandaContext';

export default function CreateTandaForm({ setShowForm }: { setShowForm: Function }) {
  const { address } = useAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { newGroup } = useConversations();
  const { getTandas } = useTandas();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<TandaFormValues>({
    defaultValues: {
      title: '',
      description: '',
      contributionAmount: 10,
      payoutInterval: 7,
      participantCount: 4,
      twitter: '',
      telegram: '',
      whatsapp: '',
      discord: '',
    },
  });

  const [validatedValues, setValidatedValues] = useState<TandaFormValues | null>(null);
  const [participantAddresses, setParticipantAddresses] = useState<string[]>([]);
  const [currentAddress, setCurrentAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const participantCount = watch('participantCount');

  // Ethereum address validation regex
  const isValidEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Handle drag and drop events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleLogoSelection(file);
      }
    }
  };

  // Handle logo selection from file input
  const handleLogoSelection = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoSelection(e.target.files[0]);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addParticipantAddress = () => {
    setAddressError('');

    if (!currentAddress.trim()) {
      setAddressError('Please enter an address');
      return;
    }

    if (!isValidEthereumAddress(currentAddress)) {
      setAddressError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    if (participantAddresses.includes(currentAddress)) {
      setAddressError('This address has already been added');
      return;
    }

    setParticipantAddresses([...participantAddresses, currentAddress]);
    setCurrentAddress('');
  };

  const removeParticipantAddress = (addressToRemove: string) => {
    setParticipantAddresses(participantAddresses.filter(addr => addr !== addressToRemove));
  };

  const uploadLogo = async () => {
    if (!logoFile) return '';

    setIsUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `tanda-logos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('tanda-logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tanda-logos')
        .getPublicUrl(data.path);

      return publicUrl;

    } catch (error) {
      console.error('Error uploading logo:', error);
      return '';
    } finally {
      setIsUploading(false);
    }
  };

  const isValidUrl = (url: string | undefined) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const onValid = async (data: TandaFormValues) => {
    // Check if we have enough participants
    if (participantAddresses.length !== Number(data.participantCount)) {
      toast.error(`Please add exactly ${data.participantCount} participant addresses. Currently added: ${participantAddresses.length}`);
      return;
    }

    setValidatedValues(data);
  };

  const saveTandaToDB = async (contractAddress: string, chatRoomId: string, logo: string) => {
    if (!validatedValues || !address) return;
    try {
      const tanda = await createTanda({
        contractAddress,
        creatorAddress: address,
        title: validatedValues.title,
        description: validatedValues.description,
        logoUrl: logo,
        contributionAmount: Number(validatedValues.contributionAmount),
        payoutInterval: Number(validatedValues.payoutInterval),
        participantCount: Number(validatedValues.participantCount),
        participants: participantAddresses,
        chatRoomId: chatRoomId,
        twitter: validatedValues?.twitter,
        discord: validatedValues?.discord,
        telegram: validatedValues?.telegram,
        whatsapp: validatedValues?.whatsapp
      });
      return tanda;
    } catch (error) {
      console.error('Error saving tanda to DB:', error);
      throw error;
    }
  };

  const calls = useCallback(() => {
    if (!validatedValues) return [];
    //           BigInt((validatedValues.payoutInterval * 86400).toFixed(0)), // Convert days to seconds

    return [
      {
        abi: TandaManagerABI,
        address: process.env.NEXT_PUBLIC_TANDA_MANAGER!,
        functionName: 'createTanda',
        args: [
          BigInt((validatedValues.contributionAmount * 1e6).toFixed(0)), // Convert to USDC wei
          BigInt((60).toFixed(0)), // Convert days to seconds
          validatedValues.participantCount,
          participantAddresses, // Whitelist array
        ],
      },
    ];
  }, [validatedValues, participantAddresses]);

  const handleOnSuccess = useCallback(async (response: any) => {
    const contractAddress = `0x${response.transactionReceipts[0].logs[0].topics[2].slice(-40)}`;
    try {
      toast.success("Tanda is created successfully!");

      let logo = '';
      if (logoFile) {
        const promise = new Promise(async (resolve, reject) => {
          try {
            logo = await uploadLogo();
            resolve(1);
          } catch (error) {
            reject(error);
          }
        });

        toast.promise(promise, {
          loading: 'Uploading logo...',
          success: 'Logo is uploaded!',
          error: 'Could not save',
        })
      }

      const addedMemberAddresses = participantAddresses.filter((member) =>
        isValidEthereumAddress(member),
      );

      if (addedMemberAddresses.length > 0) {
        const conversation = await newGroup([], {
          name: validatedValues?.title,
          description: validatedValues?.description,
          imageUrlSquare: logo,
          permissions: GroupPermissionsOptions.Default,
          customPermissionPolicySet: undefined,
        });


        const promise = new Promise(async (resolve, reject) => {
          try {
            await saveTandaToDB(contractAddress, conversation.id, logo);
            getTandas();
            resolve(1);
          } catch (error) {
            reject(error);
          }
        });

        toast.promise(promise, {
          loading: 'Saving tanda info to database',
          success: 'Tanda info saved!',
          error: 'Could not save.',
        },
          {
            style: {
              width: '260px',
              paddingRight: '10px',
            },
          })
      }
    } catch (error) {
      console.error('Error handling transaction success:', error);
    } finally {
      setShowForm();
    }
  }, [validatedValues, participantAddresses, address]);

  // Update participant count validation when addresses change
  useEffect(() => {
    if (participantAddresses.length > participantCount) {
      setValue('participantCount', participantAddresses.length);
      trigger('participantCount');
    }
  }, [participantAddresses, participantCount, setValue, trigger]);

  return (
    <div className="bg-white sm:p-6 p-3 rounded-lg border border-gray-200 shadow-sm">
      <form onSubmit={handleSubmit(onValid)} >
        <div className='grid sm:grid-cols-2 gap-2'>
          <div className='space-y-2'>
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanda Title *
              </label>
              <input
                type="text"
                {...register('title', {
                  required: 'Title is required',
                  maxLength: { value: 100, message: 'Title must be less than 100 characters' },
                })}
                className={`mt-1 block w-full rounded-md p-2 min-w-[200px] border ${errors.title ? 'border-red-300' : 'border-gray-200'
                  } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="e.g., Team Savings Pool"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description', {
                  maxLength: { value: 500, message: 'Description must be less than 500 characters' },
                })}
                rows={3}
                className={`mt-1 block w-full rounded-md min-w-[200px] p-2 border ${errors.description ? 'border-red-300' : 'border-gray-200'
                  } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Describe the purpose of this Tanda (optional)"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo
              </label>

              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${isDragging && 'border-blue-500 bg-blue-50border-gray-300'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Tanda logo preview"
                        className="mx-auto h-32 w-32 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 focus:outline-none"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Image className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="logo-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            id="logo-upload"
                            name="logo-upload"
                            type="file"
                            ref={fileInputRef}
                            className="sr-only"
                            onChange={handleLogoChange}
                            accept="image/*"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Social Links Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Social Links (Optional)</h3>

              {/* Twitter */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  {...register('twitter', {
                    validate: (value) => isValidUrl(value) || 'Please enter a valid URL'
                  })}
                  placeholder="https://twitter.com/yourgroup"
                  className={`flex-1 rounded-md p-2 border ${errors.twitter ? 'border-red-300' : 'border-gray-200'
                    } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              {errors.twitter && (
                <p className="text-red-500 text-sm -mt-2">{errors.twitter.message}</p>
              )}

              {/* Telegram */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  {...register('telegram', {
                    validate: (value) => isValidUrl(value) || 'Please enter a valid URL'
                  })}
                  placeholder="https://t.me/yourgroup"
                  className={`flex-1 rounded-md p-2 border ${errors.telegram ? 'border-red-300' : 'border-gray-200'
                    } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              {errors.telegram && (
                <p className="text-red-500 text-sm -mt-2">{errors.telegram.message}</p>
              )}

              {/* WhatsApp */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  {...register('whatsapp', {
                    validate: (value) => isValidUrl(value) || 'Please enter a valid URL'
                  })}
                  placeholder="https://chat.whatsapp.com/yourgroup"
                  className={`flex-1 rounded-md p-2 border ${errors.whatsapp ? 'border-red-300' : 'border-gray-200'
                    } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              {errors.whatsapp && (
                <p className="text-red-500 text-sm -mt-2">{errors.whatsapp.message}</p>
              )}

              {/* Discord */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  {...register('discord', {
                    validate: (value) => isValidUrl(value) || 'Please enter a valid URL'
                  })}
                  placeholder="https://discord.gg/yourgroup"
                  className={`flex-1 rounded-md p-2 border ${errors.discord ? 'border-red-300' : 'border-gray-200'
                    } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              {errors.discord && (
                <p className="text-red-500 text-sm -mt-2">{errors.discord.message}</p>
              )}
            </div>
          </div>
          <div className='space-y-2'>
            {/* Contribution Amount Field */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Contribution Amount (USDC) *
                </label>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                  <span className="absolute hidden group-hover:flex -left-32 -top-2 -translate-y-full w-64 px-2 py-1 bg-gray-700 rounded-lg text-center text-white text-sm after:content-[''] after:absolute after:left-1/2 after:top-[100%] after:-translate-x-1/2 after:border-8 after:border-x-transparent after:border-b-transparent after:border-t-gray-700">
                    Amount each participant contributes per interval (10-∞ USDC)
                  </span>
                </div>
              </div>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  {...register('contributionAmount', {
                    required: 'Contribution amount is required',
                    min: { value: 10, message: 'Minimum contribution is 10 USDC' },
                  })}
                  className={`block w-full rounded-md p-2 min-w-[200px] pr-12 border ${errors.contributionAmount ? 'border-red-300' : 'border-gray-200'
                    } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">USDC</span>
                </div>
              </div>
              {errors.contributionAmount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.contributionAmount.message}
                </p>
              )}
            </div>

            {/* Payout Interval + Participant Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payout Interval (days) *
              </label>
              <input
                type="number"
                {...register('payoutInterval', {
                  required: 'Payout interval is required',
                  min: { value: 1, message: 'Minimum interval is 1 day' },
                  max: { value: 30, message: 'Maximum interval is 30 days' },
                })}
                className={`block w-full rounded-md p-2 min-w-[200px] border ${errors.payoutInterval ? 'border-red-300' : 'border-gray-200'
                  } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.payoutInterval && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.payoutInterval.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Participants Count *
              </label>
              <input
                type="number"
                {...register('participantCount', {
                  required: 'Participant count is required',
                  min: {
                    value: 2,
                    message: 'Minimum 2 participants'
                  },
                  max: {
                    value: 50,
                    message: 'Maximum 50 participants'
                  },
                  validate: (value) =>
                    value >= participantAddresses.length ||
                    `Cannot be less than ${participantAddresses.length} already added participants`
                })}
                className={`block w-full rounded-md p-2 min-w-[200px] border ${errors.participantCount ? 'border-red-300' : 'border-gray-200'
                  } text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.participantCount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.participantCount.message}
                </p>
              )}
            </div>

            {/* Participant Addresses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participant Addresses ({participantAddresses.length} of {participantCount})
              </label>

              {/* Add Address Input */}
              <div className="flex gap-2 mb-3 w-full">
                <input
                  type="text"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="0x..."
                  style={{ width: 'inherit' }}
                  className="flex-1 rounded-md p-2 border border-gray-200 text-gray-800 focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[100px]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addParticipantAddress();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addParticipantAddress}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition flex items-center gap-1"
                >
                  Add
                </button>
              </div>

              {/* Address validation error */}
              {addressError && (
                <p className="text-red-500 text-sm mb-2">{addressError}</p>
              )}

              {/* Added addresses list */}
              {participantAddresses.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  {participantAddresses.map((address, index) => (
                    <div key={address} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                        <p className="text-sm font-mono text-gray-800 truncate">{address}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParticipantAddress(address)}
                        className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                        title="Remove address"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transaction or Submit Button */}
        <div className="pt-4">
          {validatedValues ? (
            <Transaction
              calls={calls as any}
              chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532}
              className='w-full'
              onSuccess={handleOnSuccess}
            >
              <TransactionButton
                text={"Create Tanda"}
                className={`w-full justify-center bg-blue-600 rounded-md hover:bg-blue-700 duration-100 py-3 px-4 font-medium text-white}`}
              />
              <TransactionStatus className="mt-2">
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          ) : (
            <button
              type="submit"
                className="w-full justify-center bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 transition font-medium"
              >
                {isUploading ? 'Uploading image...' : "Prepare and Build Transaction"}

            </button>
          )}
        </div>
      </form>
    </div>
  );
}