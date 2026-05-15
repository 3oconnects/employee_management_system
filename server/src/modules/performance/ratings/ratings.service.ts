export class PerformanceRatingsService {
    calculateOverallRating(goalsRating: number, reviewRating: number) {
        return (goalsRating + reviewRating) / 2;
    }
}
