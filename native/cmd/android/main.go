//go:build ignore

// Android entry — see ./binding/binding.go for exported Go functions.
// Build command:
//   gomobile bind -target android -javapkg com.erp.app -o erp.aar ./cmd/android/binding
// Then import erp.aar into the Android Studio project at native/android/.
package main

func main() {}
