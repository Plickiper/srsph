import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminProductService, Product, ProductRequest, ProductVariant } from '../../../services/admin-product.service';
import { ConfirmationModalComponent } from '../../../components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit, OnDestroy {
  @ViewChild('compatibilityDropdown', { static: false }) compatibilityDropdown!: ElementRef;
  @ViewChild('mainFileInput', { static: false }) mainFileInput!: ElementRef;
  @ViewChild('additionalFileInput', { static: false }) additionalFileInput!: ElementRef<HTMLInputElement>;
  
  product: Product = {
    name: '',
    brand: 'Sun Racing',
    category: '',
    partNumber: '',
    compatibility: '',
    price: 1, // Set minimum valid price to avoid validation errors
    stockQuantity: 0,
    description: '',
    imageUrl: '',
    images: [],
    isPublished: true,
    isFeatured: false
  };
  
  isEditMode = false;
  submitting = false;
  errorMessage = '';
  
  // Image upload properties
  selectedFiles: File[] = [];
  selectedAdditionalFiles: File[] = [];
  selectedAdditionalImageIndex: number | null = null;
  isDragOver = false;
  uploading = false;
  uploadProgress = 0;
  filePreviewUrls = new Map<File, string>();
  previewImageUrl: string = ''; // For preview only, not sent to backend
  
  // Compatibility multi-select properties
  isCompatibilityOpen = false;
  selectedCompatibilityModels: string[] = [];
  expandedBrands: string[] = [];
  
  // Category dropdown state
  isDropdownOpen = false;
  
  @HostListener('window:scroll')
  onWindowScroll() {
    // Close dropdown when user scrolls
    this.isDropdownOpen = false;
  }

  // TrackBy functions to prevent Angular diff errors
  trackByImageIndex(index: number, image: string): string {
    return image || index.toString();
  }

  trackByFileIndex(index: number, file: File): string {
    return file.name + file.size + file.lastModified;
  }
  
  compatibilityBrands = [
    {
      name: 'Yamaha',
      models: [
        'NMAX 125', 'NMAX 155 (V1)', 'NMAX 155 (V2)', 'NMAX 155 (V2.1)',
        'Aerox 155 (V1)', 'Aerox 155 (V2)', 'Aerox 155 (V3)', 'Aerox M3',
        'Mio Soul i 115', 'Mio Soul i 125', 'Mio M3', 'Mio i 125', 'Mio Sporty', 
        'Gear 125', 'Fazzio', 'Gravis'
      ]
    },
    {
      name: 'Honda',
      models: ['Click 125i', 'Click 160i', 'PCX 160', 'PCX 150', 'PCX 125']
    }
  ];
  
  // Variant pricing properties
  useVariantPricing = false;
  productVariants: ProductVariant[] = [];
  
  // Confirmation modal properties
  showConfirmationModal = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationType: 'warning' | 'danger' | 'info' = 'warning';
  pendingAction: (() => void) | null = null;

  constructor(
    private productService: AdminProductService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.isEditMode = true;
      this.loadProduct(parseInt(productId));
    }
  }

  ngOnDestroy(): void {
    this.filePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    this.filePreviewUrls.clear();
  }

  loadProduct(id: number): void {
    this.productService.getProductById(id).subscribe({
      next: (response) => {
        if (response.success && response.product) {
          this.product = response.product;
          
          // Clear any placeholder URLs that might cause issues
          if (this.product.imageUrl && this.product.imageUrl.includes('placeholder.com')) {
            console.log('Clearing placeholder URL');
            this.product.imageUrl = '';
          }
          
          // Don't set default image for existing products - only for new products
          // The product should keep its original imageUrl (empty string if no image)
          
          // Load selected compatibility models
          this.selectedCompatibilityModels = this.product.compatibility ? this.product.compatibility.split(', ').map((model: string) => {
            // Extract just the model name without brand prefix and trim whitespace
            return model.replace(/^(Yamaha|Honda)\s+/, '').trim();
          }) : [];
          
          // Auto-expand brands that have selected models
          this.expandedBrands = [];
          this.compatibilityBrands.forEach(brand => {
            if (this.getSelectedModelsForBrand(brand.name).length > 0) {
              this.expandedBrands.push(brand.name);
            }
          });
          
          // Load variants if they exist (variants are already parsed by the service)
          if (this.product.variants && this.product.variants.length > 0) {
            // Ensure we have a deep copy of the variants array
            this.productVariants = this.product.variants.map(variant => ({
              model: variant.model,
              price: variant.price,
              stockQuantity: variant.stockQuantity
            }));
            this.useVariantPricing = true;
          } else {
            this.productVariants = [];
            this.useVariantPricing = false;
          }
          
          // Update pricing mode based on loaded data
          this.updatePricingMode();
        }
      },
      error: (error: any) => {
        console.error('Error loading product:', error);
        this.errorMessage = 'Failed to load product';
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.submitting) return;

    // Validate required fields
    if (!this.product.name?.trim()) {
      this.errorMessage = 'Product name is required';
      return;
    }

    if (!this.product.category?.trim()) {
      this.errorMessage = 'Product category is required';
      return;
    }

    if (!this.product.partNumber?.trim()) {
      this.errorMessage = 'Product part number is required';
      return;
    }

    if (!this.useVariantPricing && this.product.price <= 0) {
      this.errorMessage = 'Price must be greater than 0';
      return;
    }

    if (this.useVariantPricing && this.productVariants.length > 0) {
      const invalidVariant = this.productVariants.find(v => v.price <= 0);
      if (invalidVariant) {
        this.errorMessage = `Price for variant "${invalidVariant.model}" must be greater than 0`;
        return;
      }
    }

    const action = this.isEditMode ? 'update' : 'create';
    const productName = this.product.name || 'this product';
    
    this.showConfirmation(
      `Confirm ${action === 'create' ? 'Create' : 'Update'} Product`,
      `Are you sure you want to ${action} "${productName}"?\n\nThis will ${action === 'create' ? 'add the product to your inventory' : 'save all changes to the product'}.`,
      'warning',
      () => this.performSubmit()
    );
  }

  private async performSubmit(): Promise<void> {
    this.submitting = true;
    this.errorMessage = '';

    try {
      // Don't set any default image URL - let the backend handle missing images
      // The product.imageUrl should remain empty if no image is uploaded

      // Update compatibility field before sending with full brand + model names
      const fullCompatibilityNames = this.selectedCompatibilityModels.map(selectedModel => {
        for (const brand of this.compatibilityBrands) {
          if (brand.models.includes(selectedModel)) {
            return `${brand.name} ${selectedModel}`;
          }
        }
        return selectedModel;
      });
      this.product.compatibility = fullCompatibilityNames.join(', ');

      // Update base price and stock if using variant pricing
      if (this.useVariantPricing && this.productVariants.length > 0) {
        this.product.price = this.getMinPrice();
        this.product.stockQuantity = this.getTotalStock();
      }

      // Process main image before saving
      if (this.selectedFiles.length > 0) {
        await this.processMainImageAsync();
        this.selectedFiles = [];
      }

      // Process additional images before saving
      if (this.selectedAdditionalFiles.length > 0) {
        await this.processAdditionalImagesAsync();
      }

      const productRequest: ProductRequest = {
        ...this.product,
        variants: this.useVariantPricing && this.productVariants.length > 0 ? JSON.stringify(this.productVariants) : null,
        images: this.product.images && this.product.images.length > 0 ? JSON.stringify(this.product.images) : null
      };

      if (this.isEditMode && this.product.id) {
        await this.productService.updateProduct(this.product.id, productRequest).toPromise();
      } else {
        await this.productService.createProduct(productRequest).toPromise();
      }

      this.router.navigate(['/products']);
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      // Handle validation errors
      if (error.status === 400 && error.error && error.error.fieldErrors) {
        const fieldErrors = error.error.fieldErrors;
        const errorMessages = Object.values(fieldErrors).join(', ');
        this.errorMessage = `Validation failed: ${errorMessages}`;
      } else if (error.status === 400 && error.error && error.error.error) {
        this.errorMessage = error.error.error;
      } else {
        this.errorMessage = 'Failed to save product';
      }
      
      this.submitting = false;
    }
  }

  deleteProduct(): void {
    if (!this.isEditMode || !this.product.id) return;
    
    this.showConfirmation(
      'Delete Product',
      `Are you sure you want to delete "${this.product.name}"?\n\nThis action cannot be undone and will permanently remove the product from your inventory.`,
      'danger',
      () => this.performDelete()
    );
  }

  private performDelete(): void {
    this.submitting = true;
    this.productService.deleteProduct(this.product.id!).subscribe({
      next: (response: any) => {
        this.submitting = false;
        this.router.navigate(['/products']);
      },
      error: (error: any) => {
        console.error('Error deleting product:', error);
        this.errorMessage = 'Failed to delete product';
        this.submitting = false;
      }
    });
  }

  // Image handling methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleMainImageFile(input.files[0]);
    }
  }

  onAdditionalFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  handleMainImageFile(file: File): void {
    if (!this.isValidImageFile(file)) {
      alert(`${file.name} is not a valid image file.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name} is too large. Maximum size is 10MB.`);
      return;
    }

    // Clear any existing preview and product imageUrl
    this.previewImageUrl = '';
    this.product.imageUrl = '';
    
    // Store the file for upload during form submission
    this.selectedFiles = [file];
    
    // Convert to base64 for preview only
    this.convertMainImageToBase64(file);
  }

  handleFiles(files: File[]): void {
    const validFiles = files.filter(file => {
      if (!this.isValidImageFile(file)) {
        alert(`${file.name} is not a valid image file.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    const remainingSlots = 3 - this.getTotalAdditionalImages();
    if (validFiles.length > remainingSlots) {
      if (remainingSlots <= 0) {
        alert('Maximum of 3 additional images allowed (excluding main image).');
      } else {
        alert(`You can only add ${remainingSlots} more image(s). Maximum of 3 additional images allowed.`);
      }
      return;
    }

    this.selectedAdditionalFiles = [...this.selectedAdditionalFiles, ...validFiles];
    // Note: processAdditionalImagesAsync will be called during form submission
    // We don't call it here to avoid immediate upload
  }

  isValidImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  convertMainImageToBase64(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      // Store base64 for preview only - don't set product.imageUrl yet
      // The actual imageUrl will be set after upload in processMainImageAsync
      this.previewImageUrl = base64String;
      this.uploading = false;
      this.uploadProgress = 0;
    };
    reader.onerror = () => {
      alert('Error reading the image file. Please try again.');
      this.uploading = false;
      this.uploadProgress = 0;
    };
    reader.readAsDataURL(file);
  }


  async processMainImageAsync(): Promise<void> {
    if (this.selectedFiles.length === 0) return;

    const file = this.selectedFiles[0];
    
    try {
      this.uploading = true;
      this.uploadProgress = 0;
      
      // Upload the image to the backend
      const response = await this.productService.uploadProductImage(file).toPromise();
      
      if (response && response.success) {
        // Set the actual image URL from the backend with full URL
        const backendBaseUrl = 'http://localhost:8080';
        this.product.imageUrl = response.imageUrl.startsWith('http') 
          ? response.imageUrl 
          : `${backendBaseUrl}${response.imageUrl}`;
        // Clear preview since we now have the real URL
        this.previewImageUrl = '';
      } else {
        throw new Error('Image upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      this.errorMessage = 'Failed to upload image';
      throw error;
    } finally {
      this.uploading = false;
      this.uploadProgress = 0;
    }
  }

  async processAdditionalImagesAsync(): Promise<void> {
    if (this.selectedAdditionalFiles.length === 0) {
      return;
    }

    try {
      if (!this.product.images) {
        this.product.images = [];
      }

      // Upload each additional image to the backend
      const uploadPromises = this.selectedAdditionalFiles.map(async (file) => {
        const response = await this.productService.uploadProductImage(file).toPromise();
        if (response && response.success) {
          // Ensure full URL for additional images too
          const backendBaseUrl = 'http://localhost:8080';
          return response.imageUrl.startsWith('http') 
            ? response.imageUrl 
            : `${backendBaseUrl}${response.imageUrl}`;
        } else {
          throw new Error('Failed to upload image');
        }
      });

      const uploadedImageUrls = await Promise.all(uploadPromises);
      this.product.images.push(...uploadedImageUrls);
      
      this.selectedAdditionalFiles = [];
    } catch (error) {
      console.error('Error processing additional images:', error);
      this.errorMessage = 'Failed to upload additional images';
      this.selectedAdditionalFiles = [];
    }
  }

  private convertFileToBase64Promise(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        resolve(base64String);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  getTotalAdditionalImages(): number {
    const currentImages = this.product.images ? this.product.images.length : 0;
    const newImages = this.selectedAdditionalFiles.length;
    return currentImages + newImages;
  }

  // Compatibility methods
  toggleCompatibilityDropdown(): void {
    this.isCompatibilityOpen = !this.isCompatibilityOpen;
  }

  toggleBrandExpansion(brandName: string): void {
    const index = this.expandedBrands.indexOf(brandName);
    if (index > -1) {
      this.expandedBrands.splice(index, 1);
    } else {
      this.expandedBrands.push(brandName);
    }
  }

  isBrandExpanded(brandName: string): boolean {
    return this.expandedBrands.includes(brandName);
  }

  toggleBrand(brandName: string): void {
    const brand = this.compatibilityBrands.find(b => b.name === brandName);
    if (!brand) return;

    const isAllSelected = brand.models.every(model => this.selectedCompatibilityModels.includes(model));
    
    if (isAllSelected) {
      // Deselect all models for this brand
      this.selectedCompatibilityModels = this.selectedCompatibilityModels.filter(
        model => !brand.models.includes(model)
      );
    } else {
      // Select all models for this brand
      const newModels = brand.models.filter(model => !this.selectedCompatibilityModels.includes(model));
      this.selectedCompatibilityModels = [...this.selectedCompatibilityModels, ...newModels];
    }
    
    this.updatePricingMode();
  }

  selectAllModelsForBrand(brandName: string): void {
    const brand = this.compatibilityBrands.find(b => b.name === brandName);
    if (!brand) return;

    const newModels = brand.models.filter(model => !this.selectedCompatibilityModels.includes(model));
    this.selectedCompatibilityModels = [...this.selectedCompatibilityModels, ...newModels];
    this.updatePricingMode();
  }

  clearAllModelsForBrand(brandName: string): void {
    const brand = this.compatibilityBrands.find(b => b.name === brandName);
    if (!brand) return;

    this.selectedCompatibilityModels = this.selectedCompatibilityModels.filter(
      model => !brand.models.includes(model)
    );
    this.updatePricingMode();
  }

  getSelectedModelsForBrand(brandName: string): string[] {
    const brand = this.compatibilityBrands.find(b => b.name === brandName);
    if (!brand) return [];
    
    return brand.models.filter(model => {
      return this.selectedCompatibilityModels.some(selected => 
        selected.trim() === model.trim()
      );
    });
  }

  toggleCompatibilityModel(model: string): void {
    const index = this.selectedCompatibilityModels.indexOf(model);
    if (index > -1) {
      this.selectedCompatibilityModels.splice(index, 1);
    } else {
      this.selectedCompatibilityModels.push(model);
    }
    
    // Automatically adjust pricing mode based on selected models
    this.updatePricingMode();
  }

  removeModel(model: string): void {
    const index = this.selectedCompatibilityModels.indexOf(model);
    if (index > -1) {
      this.selectedCompatibilityModels.splice(index, 1);
      this.updatePricingMode();
    }
  }

  selectAllModels(): void {
    const allModels: string[] = [];
    this.compatibilityBrands.forEach(brand => {
      allModels.push(...brand.models);
    });
    this.selectedCompatibilityModels = [...allModels];
    this.updatePricingMode();
  }

  clearAllModels(): void {
    this.selectedCompatibilityModels = [];
    this.updatePricingMode();
  }

  // Variant pricing methods
  updatePricingMode(): void {
    if (this.selectedCompatibilityModels.length > 1) {
      // Multiple models selected - enable variant pricing
      this.useVariantPricing = true;
      // Only initialize variants if we don't already have variant data
      if (this.productVariants.length === 0) {
        this.initializeVariants();
      }
    } else if (this.selectedCompatibilityModels.length === 1) {
      // Single model selected - disable variant pricing, use single price
      this.useVariantPricing = false;
      this.productVariants = [];
    } else {
      // No models selected - disable variant pricing, use single price
      this.useVariantPricing = false;
      this.productVariants = [];
    }
  }

  toggleVariantPricing(): void {
    this.useVariantPricing = !this.useVariantPricing;
    if (this.useVariantPricing && this.productVariants.length === 0) {
      this.initializeVariants();
    }
  }

  initializeVariants(): void {
    if (this.selectedCompatibilityModels.length > 0) {
      this.productVariants = this.selectedCompatibilityModels.map(model => ({
        model: model,
        price: this.product.price,
        stockQuantity: Math.floor(this.product.stockQuantity / this.selectedCompatibilityModels.length)
      }));
    }
  }

  getMinPrice(): number {
    if (!this.productVariants.length) return this.product.price;
    return Math.min(...this.productVariants.map(v => v.price));
  }

  getMaxPrice(): number {
    if (!this.productVariants.length) return this.product.price;
    return Math.max(...this.productVariants.map(v => v.price));
  }

  getTotalStock(): number {
    if (!this.productVariants.length) return this.product.stockQuantity;
    return this.productVariants.reduce((total, variant) => total + variant.stockQuantity, 0);
  }

  onVariantPriceChange(): void {
    // Update base price to min price
    this.product.price = this.getMinPrice();
  }

  onVariantStockChange(): void {
    // Update base stock to total stock
    this.product.stockQuantity = this.getTotalStock();
  }

  // Stock status methods
  getStockStatus(stockQuantity: number): 'out' | 'low' | 'good' {
    if (stockQuantity === 0) {
      return 'out';
    } else if (stockQuantity <= 10) {
      return 'low';
    } else {
      return 'good';
    }
  }

  getStockStatusText(stockQuantity: number): string {
    const status = this.getStockStatus(stockQuantity);
    switch (status) {
      case 'out':
        return 'Out of Stock';
      case 'low':
        return 'Low Stock';
      case 'good':
        return 'Good Stock';
      default:
        return 'Unknown';
    }
  }

  // Utility methods
  getDefaultImageUrl(): string {
    // Return empty string instead of placeholder URL to avoid network errors
    return '';
  }

  getFilePreview(file: File): string {
    if (!this.filePreviewUrls.has(file)) {
      const url = URL.createObjectURL(file);
      this.filePreviewUrls.set(file, url);
    }
    return this.filePreviewUrls.get(file)!;
  }

  removeCurrentImage(): void {
    this.product.imageUrl = '';
  }


  replaceAdditionalImage(index: number): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file && this.isValidImageFile(file) && file.size <= 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = e.target?.result as string;
          if (this.product.images && this.product.images[index]) {
            this.product.images[index] = base64String;
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  removeAdditionalImage(index: number): void {
    if (this.product.images && this.product.images[index]) {
      this.product.images.splice(index, 1);
    }
  }

  removeAdditionalFile(index: number): void {
    this.selectedAdditionalFiles.splice(index, 1);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleMainImageFile(files[0]);
    }
  }

  // Confirmation modal methods
  showConfirmation(title: string, message: string, type: 'warning' | 'danger' | 'info', action: () => void): void {
    this.confirmationTitle = title;
    this.confirmationMessage = message;
    this.confirmationType = type;
    this.pendingAction = action;
    this.showConfirmationModal = true;
  }

  onConfirmAction(): void {
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
    this.showConfirmationModal = false;
  }

  onCancelAction(): void {
    this.pendingAction = null;
    this.showConfirmationModal = false;
  }

  onCloseModal(): void {
    this.pendingAction = null;
    this.showConfirmationModal = false;
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }

  triggerMainFileInput(): void {
    if (this.mainFileInput) {
      this.mainFileInput.nativeElement.click();
    }
  }

  triggerAdditionalFileInput(): void {
    if (this.additionalFileInput) {
      this.additionalFileInput.nativeElement.click();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.compatibilityDropdown && !this.compatibilityDropdown.nativeElement.contains(event.target)) {
      this.isCompatibilityOpen = false;
    }
  }
}
