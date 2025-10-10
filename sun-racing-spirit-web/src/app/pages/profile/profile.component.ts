import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { BaseComponent } from '../../core/base-component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent extends BaseComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isDeleting = false;
  profileImagePreview: string | null = null;
  selectedFile: File | null = null;
  hasChanges = false;
  originalFormValue: any = null;
  isDropdownOpen = false;
  showProfileOverlay = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private title: Title,
    private notificationService: NotificationService,
    private http: HttpClient
  ) {
    super();
    this.profileForm = this.fb.group({
      username: [{ value: '', disabled: true }], // Fixed, not editable
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.pattern(/^[0-9+\-\s()]+$/)]],
      gender: [''],
      dateOfBirth: [{ value: '', disabled: true }], // Not changeable
      profilePicture: [null],
      address: [''],
      city: [''],
      state: [''],
      postalCode: [''],
      country: ['']
    });

    // Track form changes
    this.addSubscription(
      this.profileForm.valueChanges.subscribe(() => {
        this.checkForChanges();
      })
    );
  }

  ngOnInit(): void {
    this.title.setTitle('Profile - Sun Racing Spirit Philippines');
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadUserProfile();
  }

  override ngOnDestroy(): void {
    // Call parent ngOnDestroy to unsubscribe from all subscriptions
    super.ngOnDestroy();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    // Close any open dropdowns when scrolling
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.tagName === 'SELECT') {
      activeElement.blur();
      this.isDropdownOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdown when clicking outside
    const target = event.target as HTMLElement;
    const activeElement = document.activeElement as HTMLElement;
    
    if (activeElement && 
        activeElement.tagName === 'SELECT' && 
        !activeElement.contains(target)) {
      activeElement.blur();
      this.isDropdownOpen = false;
    }
  }

  onDropdownMouseDown(event: Event): void {
    const target = event.target as HTMLSelectElement;
    
    // If dropdown is already open (focused), prevent the default behavior and close it
    if (document.activeElement === target) {
      event.preventDefault();
      target.blur();
      this.isDropdownOpen = false;
    }
    // If dropdown is closed, let the browser handle opening it naturally
  }

  onDropdownFocus(event: Event): void {
    this.isDropdownOpen = true;
  }

  onDropdownBlur(event: Event): void {
    this.isDropdownOpen = false;
  }

  onDropdownChange(event: Event): void {
    // When a value is selected, close the dropdown
    this.isDropdownOpen = false;
  }


  loadUserProfile(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      const formData = {
        username: this.currentUser.username || '',
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
        email: this.currentUser.email || '',
        phoneNumber: this.currentUser.phoneNumber || '',
        gender: this.currentUser.gender || '',
        dateOfBirth: this.currentUser.dateOfBirth || '',
        profilePicture: this.currentUser.profilePicture,
        address: this.currentUser.address || '',
        city: this.currentUser.city || '',
        state: this.currentUser.state || '',
        postalCode: this.currentUser.postalCode || '',
        country: this.currentUser.country || ''
      };
      
      this.profileForm.patchValue(formData);
      this.originalFormValue = { ...formData };
      this.hasChanges = false;
      
      console.log('loadUserProfile - formData.profilePicture:', formData.profilePicture);
      console.log('loadUserProfile - hasProfilePicture():', this.hasProfilePicture());
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.notificationService.error('Please select a valid image file.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error('Image size must be less than 5MB.');
        return;
      }

      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImagePreview = e.target?.result as string;
        // Update the form control
        this.profileForm.patchValue({ profilePicture: this.profileImagePreview });
      };
      reader.readAsDataURL(file);
    }
  }

  removeProfilePicture(): void {
    this.selectedFile = null;
    this.profileImagePreview = null;
    this.profileForm.patchValue({ profilePicture: null });
    
    console.log('After remove - form profilePicture:', this.profileForm.value.profilePicture);
    console.log('After remove - currentUser profilePicture:', this.currentUser?.profilePicture);
    console.log('After remove - hasProfilePicture():', this.hasProfilePicture());
    
    // Mark form as changed so user can save
    this.checkForChanges();
  }


  checkForChanges(): void {
    if (this.originalFormValue) {
      const currentValue = this.profileForm.value;
      this.hasChanges = JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
    }
  }

  hasProfilePicture(): boolean {
    // If there's a preview, show it
    if (this.profileImagePreview) {
      return true;
    }
    
    // If form has profilePicture set to null, don't show current user's picture
    if (this.profileForm.value.profilePicture === null) {
      return false;
    }
    
    // Otherwise, show current user's picture if it exists and is not empty
    const profilePic = this.currentUser?.profilePicture;
    return !!(profilePic && profilePic !== null && profilePic.trim() !== '');
  }

  resetForm(): void {
    this.loadUserProfile();
    this.selectedFile = null;
    this.profileImagePreview = null;
  }

  saveProfile(): void {
    if (this.profileForm.valid && this.currentUser) {
      const formValue = this.profileForm.value;
      
      const updateData: any = {
        userId: this.currentUser.id,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phoneNumber: formValue.phoneNumber,
        gender: formValue.gender,
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        postalCode: formValue.postalCode,
        country: formValue.country
      };

      // Only include profilePicture if it's not null/empty
      if (formValue.profilePicture && formValue.profilePicture.trim() !== '') {
        updateData.profilePicture = formValue.profilePicture;
      } else {
        updateData.profilePicture = null;
      }
      

      this.http.put('http://localhost:8080/api/customer/auth/profile', updateData).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.notificationService.success('Profile updated successfully!');
            
            // Update current user data
            if (this.currentUser && response.user) {
              this.currentUser = { ...this.currentUser, ...response.user };
              this.authService.setCurrentUser(this.currentUser);
            }
            
            // Reset form to reflect saved changes
            this.loadUserProfile();
            this.selectedFile = null;
            this.profileImagePreview = null;
          } else {
            this.notificationService.error(response.message || 'Failed to update profile');
          }
        },
        error: (error) => {
          this.notificationService.error('Failed to update profile. Please try again.');
          console.error('Profile update error:', error);
        }
      });
    } else {
      this.notificationService.error('Please fill in all required fields correctly.');
    }
  }

  confirmDeleteAccount(): void {
    this.isDeleting = true;
  }

  cancelDeleteAccount(): void {
    this.isDeleting = false;
  }

  deleteAccount(): void {
    if (this.currentUser) {
      this.http.delete('http://localhost:8080/api/customer/auth/profile', {
        body: { userId: this.currentUser.id }
      }).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.notificationService.success('Account deleted successfully.');
            this.authService.logout();
            this.router.navigate(['/']);
          } else {
            this.notificationService.error(response.message || 'Failed to delete account');
          }
        },
        error: (error) => {
          this.notificationService.error('Failed to delete account. Please try again.');
          console.error('Account deletion error:', error);
        }
      });
    }
  }

  getAge(): number | null {
    const dob = this.profileForm.get('dateOfBirth')?.value || this.currentUser?.dateOfBirth;
    if (dob) {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    }
    return null;
  }

  isOver18(): boolean {
    const age = this.getAge();
    return age !== null && age >= 18;
  }

  getAgeStatus(): string {
    const age = this.getAge();
    if (age === null) return 'Unknown';
    if (age >= 18) return 'Verified (18+)';
    return 'Under 18 - Cannot checkout';
  }

  getAgeStatusClass(): string {
    const age = this.getAge();
    if (age === null) return 'status-unknown';
    if (age >= 18) return 'status-verified';
    return 'status-underage';
  }

  isProfileComplete(): boolean {
    if (!this.currentUser) return false;
    
    return !!(
      this.currentUser.firstName &&
      this.currentUser.lastName &&
      this.currentUser.email &&
      this.currentUser.gender &&
      this.currentUser.dateOfBirth
    );
  }
}